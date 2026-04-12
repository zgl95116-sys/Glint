/**
 * 预生成锁屏 HTML — 用于 Canvas 交互 / 生成式动画等
 * flash-lite 无法实时生成的高复杂度场景。
 *
 * 格式：完整 <!doctype html>，与 Gemini 实时输出格式一致，
 * 直接交给 Sandbox 渲染。不要写固定 width/height，sandbox 自带全屏。
 */

// ─────────────────────────────────────────────
// 0. 开机首帧 — 漂浮玻璃便签 + 点击翻转
// ─────────────────────────────────────────────
export const PREFAB_AMBIENT_BOOT = `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="color-scheme" content="dark">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-user-select:none;user-select:none}
body{overflow:hidden;background:#08051a;font-family:var(--font-display,-apple-system,"Helvetica Neue","PingFang SC",system-ui,sans-serif);touch-action:none}
canvas{position:absolute;inset:0;z-index:0}
.bg{position:absolute;inset:0;overflow:hidden;filter:blur(70px);opacity:1;z-index:1}
.bg i{position:absolute;border-radius:50%}
.bg i:nth-child(1){top:-20%;left:-15%;width:80vmin;height:80vmin;background:radial-gradient(circle,rgba(120,50,180,.8),rgba(80,20,140,.4) 50%,transparent 70%);animation:d1 14s ease-in-out infinite}
.bg i:nth-child(2){bottom:0%;right:-20%;width:75vmin;height:75vmin;background:radial-gradient(circle,rgba(30,100,180,.7),rgba(20,60,140,.3) 50%,transparent 70%);animation:d2 18s ease-in-out infinite}
.bg i:nth-child(3){top:35%;left:20%;width:60vmin;height:60vmin;background:radial-gradient(circle,rgba(180,60,100,.5),rgba(120,30,80,.2) 50%,transparent 70%);animation:d3 22s ease-in-out infinite}
.bg i:nth-child(4){bottom:25%;left:50%;width:50vmin;height:50vmin;background:radial-gradient(circle,rgba(60,180,160,.4),rgba(30,120,100,.15) 50%,transparent 70%);animation:d1 26s ease-in-out infinite reverse}
@keyframes d1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,30px) scale(1.15)}66%{transform:translate(-20px,-15px) scale(.9)}}
@keyframes d2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-35px,-20px) scale(1.12)}66%{transform:translate(20px,35px) scale(.88)}}
@keyframes d3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(25px,-25px) scale(1.18)}}
.time-row{position:absolute;top:8%;left:7%;right:7%;z-index:20;pointer-events:none}
.time-big{font-size:clamp(72px,28vw,180px);font-weight:100;color:rgba(255,255,255,.82);line-height:.9;letter-spacing:-4px}
.time-sub{font-size:14px;color:rgba(255,255,255,.28);letter-spacing:4px;margin-top:6px}
.cards{position:absolute;top:28%;bottom:12%;left:5%;right:5%;z-index:10}
.card{position:absolute;width:clamp(140px,42vw,200px);border-radius:16px;padding:16px 14px 14px;cursor:pointer;perspective:600px;
  background:rgba(255,255,255,.05);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border:1px solid rgba(255,255,255,.08);
  transition:transform .6s cubic-bezier(.23,1,.32,1),box-shadow .6s ease,opacity .6s ease;
  box-shadow:0 4px 30px rgba(0,0,0,.3)}
.card:active{transform:scale(1.05)!important;box-shadow:0 8px 40px rgba(120,100,220,.25)!important}
.card .front,.card .back{transition:opacity .4s ease}
.card.flipped .front{opacity:0}
.card.flipped .back{opacity:1}
.card .back{opacity:0;position:absolute;inset:16px 14px 14px}
.card-icon{font-size:20px;margin-bottom:6px}
.card-text{font-size:14px;color:rgba(255,255,255,.8);line-height:1.5;font-weight:300}
.card-hint{font-size:11px;color:rgba(255,255,255,.25);margin-top:8px;letter-spacing:1px}
.back .card-text{color:rgba(200,180,255,.9)}
.footer{position:absolute;bottom:6%;left:0;right:0;text-align:center;z-index:20;pointer-events:none}
.footer-text{font-size:13px;color:rgba(255,255,255,.2);letter-spacing:2px}
@keyframes float{0%,100%{transform:translateY(0px)}50%{transform:translateY(-10px)}}
</style>
</head><body>
<canvas id="cv"></canvas>
<div class="bg"><i></i><i></i><i></i><i></i></div>
<div class="time-row"><div class="time-big" id="tm"></div><div class="time-sub" id="dt"></div></div>
<div class="cards" id="cards"></div>
<div class="footer"><div class="footer-text">点一张卡片 · 看看背面写了什么</div></div>
<script>
(function(){
// ── Particle starfield background ──
var cv=document.getElementById('cv'),cx=cv.getContext('2d');
var W,H,dpr=Math.min(window.devicePixelRatio||1,2);
function rsz(){W=window.innerWidth;H=window.innerHeight;cv.width=W*dpr;cv.height=H*dpr;cx.setTransform(dpr,0,0,dpr,0,0);}
rsz();
var stars=[];
for(var i=0;i<100;i++){
  stars.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*2+.4,
    dx:(Math.random()-.5)*.15,dy:Math.random()*.1+.02,
    phase:Math.random()*Math.PI*2,speed:Math.random()*.8+.4,
    hue:Math.random()>.7?'220,200,255':'180,160,240'});
}
function drawStars(){
  cx.clearRect(0,0,W,H);
  var t=performance.now()*.001;
  for(var i=0;i<stars.length;i++){
    var s=stars[i];
    s.x+=s.dx;s.y+=s.dy;
    if(s.y>H+10){s.y=-10;s.x=Math.random()*W;}
    if(s.x<-10)s.x=W+10;if(s.x>W+10)s.x=-10;
    var twinkle=.4+Math.sin(t*s.speed+s.phase)*.4;
    cx.globalAlpha=twinkle;
    cx.fillStyle='rgba('+s.hue+',1)';
    cx.beginPath();cx.arc(s.x,s.y,s.r,0,Math.PI*2);cx.fill();
    if(s.r>1.2){
      cx.globalAlpha=twinkle*.2;
      cx.beginPath();cx.arc(s.x,s.y,s.r*5,0,Math.PI*2);cx.fill();
    }
  }
  cx.globalAlpha=1;
  requestAnimationFrame(drawStars);
}
drawStars();

// ── Time & cards ──
var now=new Date(),h=now.getHours(),mi=String(now.getMinutes()).padStart(2,'0');
var days=['周日','周一','周二','周三','周四','周五','周六'];
document.getElementById('tm').textContent=h+':'+mi;
document.getElementById('dt').textContent=(now.getMonth()+1)+'月'+now.getDate()+'日 '+days[now.getDay()];

// Card data: [icon, front text, back text]
var data=[
  ['💭','今天有什么想做的？','不想做也没关系，\\n发呆也是一种充电。'],
  ['☀️','外面 22°C · 晴','适合出门走走，\\n阳光在 18:30 落下。'],
  ['📋','待办还剩 3 件','最重要的那件，\\n你心里已经知道是哪个。'],
  ['🎵','昨晚听着歌睡着了','《河流》播到 3:30 暂停，\\n要不要继续？'],
  ['✉️','有 2 条消息没看','都不急。\\n重要的人会打电话。'],
  ['🌙','昨晚 11:47 才睡','比前天早了 20 分钟，\\n在变好。']
];
// Shuffle based on time so each boot feels different
var seed=h*60+now.getMinutes();
data.sort(function(a,b){return Math.sin(seed*a[0].charCodeAt(0))-Math.sin(seed*b[0].charCodeAt(0));});

var container=document.getElementById('cards');
var positions=[
  {top:'0%',left:'2%'},{top:'5%',right:'0%'},
  {top:'32%',left:'8%'},{top:'38%',right:'5%'},
  {top:'64%',left:'0%'},{top:'68%',right:'8%'}
];
var durations=[6,7,5.5,8,6.5,7.5];

data.forEach(function(d,i){
  var card=document.createElement('div');
  card.className='card';
  var pos=positions[i];
  if(pos.left!==undefined)card.style.left=pos.left;
  if(pos.right!==undefined)card.style.right=pos.right;
  card.style.top=pos.top;
  card.style.animation='float '+durations[i]+'s ease-in-out '+(i*0.8)+'s infinite';

  var backText=d[2].replace(/\\\\n/g,'<br>');

  card.innerHTML='<div class="front">'
    +'<div class="card-icon">'+d[0]+'</div>'
    +'<div class="card-text">'+d[1]+'</div>'
    +'<div class="card-hint">点击翻转</div>'
    +'</div>'
    +'<div class="back">'
    +'<div class="card-icon">✦</div>'
    +'<div class="card-text">'+backText+'</div>'
    +'</div>';

  card.addEventListener('click',function(e){
    e.stopPropagation();
    card.classList.toggle('flipped');
    // Auto flip back after 4s
    if(card.classList.contains('flipped')){
      setTimeout(function(){card.classList.remove('flipped');},4000);
    }
  });

  container.appendChild(card);
});
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

// ─────────────────────────────────────────────
// 17-danmaku-mood
// ─────────────────────────────────────────────
export const PREFAB_DANMAKU = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>弹幕心情墙 - Glint 灵犀</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
            background: linear-gradient(135deg, #0a1428 0%, #1a2a4a 50%, #0d1f3c 100%);
        }

        canvas {
            display: block;
            background: linear-gradient(135deg, #0a1428 0%, #1a2a4a 50%, #0d1f3c 100%);
        }

        .ui-container {
            position: fixed;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }

        .header {
            position: absolute;
            top: 20px;
            left: 20px;
            color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
            font-weight: 500;
            letter-spacing: 1px;
            padding: 12px 16px;
            background: rgba(10, 20, 40, 0.4);
            backdrop-filter: blur(8px);
            border-radius: 8px;
            border: 1px solid rgba(100, 213, 255, 0.2);
        }

        .counter {
            font-size: 16px;
            color: #64d5ff;
            margin-top: 4px;
        }

        .glint-brand {
            position: absolute;
            bottom: 20px;
            right: 20px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.4);
            letter-spacing: 2px;
        }

        .tap-hint {
            position: absolute;
            bottom: 60px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
            opacity: 0;
            animation: fadeInOut 3s ease-in-out infinite;
        }

        @keyframes fadeInOut {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
        }

        .input-overlay {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(180deg, rgba(10, 20, 40, 0) 0%, rgba(10, 20, 40, 0.95) 30%, rgba(10, 20, 40, 0.98) 100%);
            padding: 40px 20px 30px;
            z-index: 1000;
            opacity: 0;
            transform: translateY(100%);
            transition: all 0.3s ease;
            pointer-events: auto;
        }

        .input-overlay.active {
            opacity: 1;
            transform: translateY(0);
        }

        .input-field {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #64d5ff;
            background: rgba(20, 40, 80, 0.8);
            color: #fff;
            border-radius: 8px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
        }

        .input-field:focus {
            border-color: #ffd700;
        }

        .input-hint {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
            margin-top: 8px;
            text-align: center;
        }

        .reaction-emoji {
            position: fixed;
            font-size: 24px;
            pointer-events: none;
            user-select: none;
            z-index: 999;
        }

        @keyframes floatUp {
            0% {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateY(-80px) scale(0.8);
            }
        }

        .reaction-emoji.animate {
            animation: floatUp 1.5s ease-out forwards;
        }
    </style>
</head>
<body>
    <canvas id="danmakuCanvas"></canvas>

    <div class="ui-container">
        <div class="header">
            <div>灵犀心情墙</div>
            <div class="counter">今日弹幕 · <span id="counter">2847</span></div>
        </div>

        <div class="tap-hint">轻点屏幕添加心情弹幕</div>

        <div class="glint-brand">GLINT 灵犀</div>
    </div>

    <div class="input-overlay" id="inputOverlay">
        <input type="text" class="input-field" id="danmakuInput" placeholder="分享你的心情..." maxlength="30">
        <div class="input-hint">按 Enter 发送，按 Esc 取消</div>
    </div>

    <script>
        // Mood phrases
        const moodPhrases = [
            "今天摸鱼成功🐟",
            "咖啡续命中☕",
            "想下班了💤",
            "周五快乐🎉",
            "代码写不动了💻",
            "外卖到了🍜",
            "今天天气真好☀️",
            "又是充实的一天",
            "好困😴",
            "加油打工人💪",
            "晚上吃什么🤔",
            "想去旅游✈️",
            "音乐真好听🎵",
            "减肥从明天开始",
            "今天心情不错😊",
            "我要努力💯",
            "天选打工人",
            "起床困难症",
            "快乐不再来",
            "每天都在进步"
        ];

        const reactionEmojis = ["❤️", "😂", "👍", "🔥", "💯", "🎉", "✨", "😍", "🤔", "👏"];

        const colors = [
            "#ff6b6b", "#ff8787", "#ff922b", "#ffa94d",
            "#ffd93d", "#6bcf7f", "#4ecdc4", "#45b7d1",
            "#96ceb4", "#dda15e", "#bc6c25", "#d4a5a5"
        ];

        const bgColors = [
            "rgba(255, 107, 107, 0.2)",
            "rgba(255, 160, 77, 0.2)",
            "rgba(217, 217, 38, 0.2)",
            "rgba(107, 207, 127, 0.2)",
            "rgba(78, 205, 196, 0.2)",
            "rgba(69, 183, 209, 0.2)",
            "rgba(150, 206, 180, 0.2)",
            "rgba(222, 165, 95, 0.2)"
        ];

        class Danmaku {
            constructor(text, x, y, speed, fontSize, color, bgColor = null, opacity = 1, isUserDanmaku = false) {
                this.text = text;
                this.x = x;
                this.y = y;
                this.speed = speed;
                this.fontSize = fontSize;
                this.color = color;
                this.bgColor = bgColor;
                this.opacity = opacity;
                this.alive = true;
                this.createdAt = Date.now();
                this.ttl = 8000 + Math.random() * 4000; // 8-12s lifetime
                this.wobblePhase = Math.random() * Math.PI * 2;
                this.isUserDanmaku = isUserDanmaku;
            }

            update(deltaTime) {
                this.x -= this.speed * deltaTime / 16.67; // Normalize to 60fps

                // Fade out at the end
                const age = Date.now() - this.createdAt;
                if (age > this.ttl - 2000) {
                    this.opacity = Math.max(0, 1 - (age - (this.ttl - 2000)) / 2000);
                }

                if (this.x + 200 < 0) {
                    this.alive = false;
                }
            }

            getWobbleOffset(canvasHeight) {
                const age = Date.now() - this.createdAt;
                const wobble = Math.sin(age / 300 + this.wobblePhase) * 3; // 3px max wobble
                return wobble;
            }

            draw(ctx, canvasHeight) {
                if (!this.alive) return;

                ctx.save();
                ctx.globalAlpha = this.opacity;

                const wobbleY = this.getWobbleOffset(canvasHeight);
                const drawY = this.y + wobbleY;

                // Draw golden glow for user danmaku
                if (this.isUserDanmaku) {
                    ctx.fillStyle = "rgba(255, 215, 0, 0.15)";
                    ctx.font = \`\${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif\`;
                    const metrics = ctx.measureText(this.text);
                    const width = metrics.width + 32;
                    const height = this.fontSize + 16;
                    ctx.beginPath();
                    ctx.roundRect(this.x - 16, drawY - this.fontSize / 2 - 8, width, height, 8);
                    ctx.fill();
                }

                // Draw background pill if exists
                if (this.bgColor) {
                    ctx.fillStyle = this.bgColor;
                    ctx.font = \`\${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif\`;
                    const metrics = ctx.measureText(this.text);
                    const width = metrics.width + 16;
                    const height = this.fontSize + 8;
                    ctx.beginPath();
                    ctx.roundRect(this.x - 8, drawY - this.fontSize / 2 - 4, width, height, 4);
                    ctx.fill();
                }

                // Draw text with shadow glow
                ctx.font = \`\${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif\`;
                ctx.textBaseline = "middle";
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 8;
                ctx.fillStyle = this.color;
                ctx.fillText(this.text, this.x, drawY);
                ctx.shadowColor = "transparent";
                ctx.shadowBlur = 0;

                ctx.restore();
            }
        }

        const canvas = document.getElementById("danmakuCanvas");
        const ctx = canvas.getContext("2d");
        const inputOverlay = document.getElementById("inputOverlay");
        const danmakuInput = document.getElementById("danmakuInput");
        const counterEl = document.getElementById("counter");

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let danmakuList = [];
        let lastTime = Date.now();
        let spawnTimer = 0;
        let counter = 2847;
        let inputActive = false;
        let burstMode = false;
        let burstCount = 0;

        // Star field
        let stars = [];
        function generateStars() {
            stars = [];
            for (let i = 0; i < 60; i++) {
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 1.5,
                    opacity: Math.random() * 0.6 + 0.2,
                    twinklePhase: Math.random() * Math.PI * 2,
                    twinkleSpeed: Math.random() * 0.002 + 0.001
                });
            }
        }
        generateStars();

        // Polyfill for roundRect
        if (!CanvasRenderingContext2D.prototype.roundRect) {
            CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
                if (w < 2 * r) r = w / 2;
                if (h < 2 * r) r = h / 2;
                this.beginPath();
                this.moveTo(x + r, y);
                this.arcTo(x + w, y, x + w, y + h, r);
                this.arcTo(x + w, y + h, x, y + h, r);
                this.arcTo(x, y + h, x, y, r);
                this.arcTo(x, y, x + r, y, r);
                this.closePath();
                return this;
            };
        }

        function spawnRandomDanmaku() {
            const phrase = moodPhrases[Math.floor(Math.random() * moodPhrases.length)];
            const y = 40 + Math.random() * (canvas.height - 80);
            const speed = 1 + Math.random() * 1.5;
            const fontSize = 14 + Math.random() * 14;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const hasBg = Math.random() > 0.4;
            const bgColor = hasBg ? bgColors[Math.floor(Math.random() * bgColors.length)] : null;
            const opacity = 0.6 + Math.random() * 0.4;
            const initialX = Math.random() * canvas.width * 1.5; // Spread initial x

            danmakuList.push(new Danmaku(phrase, initialX, y, speed, fontSize, color, bgColor, opacity, false));
            counter++;
            updateCounter();
        }

        function spawnUserDanmaku(text) {
            const y = 60 + Math.random() * (canvas.height - 120); // Random y position
            const speed = 2;
            const fontSize = 22; // Slightly larger
            const color = "#ffd700";
            const bgColor = "rgba(255, 215, 0, 0.3)";
            const displayText = "✦ " + text; // Add prefix

            danmakuList.push(new Danmaku(displayText, canvas.width, y, speed, fontSize, color, bgColor, 1, true));
            counter += 10;
            updateCounter();
        }

        function spawnReactionEmoji(x, y) {
            const emoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
            const el = document.createElement("div");
            el.className = "reaction-emoji animate";
            el.textContent = emoji;
            el.style.left = x + "px";
            el.style.top = y + "px";
            el.style.transform = "translate(-50%, -50%)";
            document.body.appendChild(el);

            setTimeout(() => el.remove(), 1500);
        }

        function updateCounter() {
            counterEl.textContent = counter.toLocaleString();
        }

        function drawStars() {
            const now = Date.now();
            stars.forEach(star => {
                const twinkle = Math.sin(now * star.twinkleSpeed + star.twinklePhase);
                const opacity = star.opacity * (0.4 + 0.6 * (twinkle + 1) / 2);
                ctx.fillStyle = \`rgba(255, 255, 255, \${opacity})\`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        function animate() {
            const now = Date.now();
            const deltaTime = now - lastTime;
            lastTime = now;

            // Update danmaku
            danmakuList.forEach(d => d.update(deltaTime));
            danmakuList = danmakuList.filter(d => d.alive);

            // Spawn new danmaku with burst pacing
            spawnTimer += deltaTime;
            let spawnInterval = 500 + Math.random() * 500;

            // Burst mode: spawn 2 close together, then longer gap
            if (burstMode) {
                spawnInterval = 200 + Math.random() * 100;
                burstCount++;
                if (burstCount >= 2) {
                    burstMode = false;
                    burstCount = 0;
                    spawnInterval = 1000 + Math.random() * 500; // Longer gap after burst
                }
            } else if (Math.random() > 0.8) {
                // Chance to enter burst mode
                burstMode = true;
                burstCount = 0;
                spawnInterval = 200 + Math.random() * 100;
            }

            if (spawnTimer > spawnInterval) {
                spawnRandomDanmaku();
                spawnTimer = 0;
            }

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw stars
            drawStars();

            // Draw danmaku
            danmakuList.forEach(d => d.draw(ctx, canvas.height));

            requestAnimationFrame(animate);
        }

        function openInput() {
            inputActive = true;
            inputOverlay.classList.add("active");
            danmakuInput.focus();
            danmakuInput.value = "";
        }

        function closeInput() {
            inputActive = false;
            inputOverlay.classList.remove("active");
        }

        function handleDanmakuSubmit() {
            const text = danmakuInput.value.trim();
            if (text) {
                spawnUserDanmaku(text);
            }
            closeInput();
        }

        // Event listeners
        canvas.addEventListener("click", (e) => {
            if (!inputActive) {
                // Random chance to show reaction emoji
                if (Math.random() > 0.3) {
                    spawnReactionEmoji(e.clientX, e.clientY);
                } else {
                    openInput();
                }
            }
        });

        danmakuInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                handleDanmakuSubmit();
            } else if (e.key === "Escape") {
                closeInput();
            }
        });

        window.addEventListener("resize", () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            generateStars(); // Regenerate stars for new canvas size
        });

        // Initialize
        for (let i = 0; i < 20; i++) {
            spawnRandomDanmaku();
        }

        animate();
    </script>
</body>
</html>`;

// ─────────────────────────────────────────────
// 18-sound-wave
// ─────────────────────────────────────────────
export const PREFAB_SOUND_WAVE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Glint - 音浪 (Sound Wave)</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            width: 100%;
            height: 100vh;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0f;
        }

        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }

        #info {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            text-align: center;
            color: rgba(200, 200, 220, 0.6);
            font-size: 11px;
            pointer-events: none;
        }
    </style>
</head>
<body>
    <canvas id="canvas"></canvas>
    <div id="info">✨ GLINT</div>

    <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        // Responsive canvas
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // === Configuration ===
        const CONFIG = {
            numBars: 64,
            centerX: 0,
            centerY: 0,
            baseRadius: 0,
            barMaxLength: 0,
            numParticles: 35,
            particleBaseRadius: 0,
        };

        function updateDimensions() {
            CONFIG.centerX = canvas.width / 2;
            CONFIG.centerY = canvas.height / 2;
            CONFIG.baseRadius = Math.min(canvas.width, canvas.height) * 0.2;
            CONFIG.barMaxLength = Math.min(canvas.width, canvas.height) * 0.25;
            CONFIG.particleBaseRadius = CONFIG.baseRadius + CONFIG.barMaxLength * 0.6;
        }
        updateDimensions();
        window.addEventListener('resize', updateDimensions);

        // === State ===
        const state = {
            time: 0,
            touchActive: false,
            touchAmplitude: 0, // Springs back from 1.0
            baseAmplitude: 0.7,
            beatPattern: 0, // Changes every few seconds
            colors: {
                hue: 280, // Start with purple/blue
                saturation: 75,
                lightness: 50,
                hueAtTouchStart: 280,
            },
            rippleRadius: 0,
            rippleOpacity: 0,
            lastAudioData: null,
            smoothAudioData: null,
            beatDropIntensity: 0,
        };

        // === Particle System ===
        class Particle {
            constructor() {
                this.angle = Math.random() * Math.PI * 2;
                this.distance = CONFIG.particleBaseRadius + (Math.random() - 0.5) * 40;
                this.size = 2 + Math.random() * 3;
                this.phase = Math.random() * Math.PI * 2;
                this.trailX = [];
                this.trailY = [];
                this.trailLife = [];
                this.lastX = 0;
                this.lastY = 0;
            }

            update(time, amplitude, touchActive) {
                this.phase = time * 2 + this.angle;
                const beatPulse = Math.sin(time * 4) * 0.5 + 0.5;
                this.currentSize = this.size * (0.5 + beatPulse * amplitude * 0.8);

                // Calculate current position
                this.x = CONFIG.centerX + Math.cos(this.angle) * this.distance;
                this.y = CONFIG.centerY + Math.sin(this.angle) * this.distance;

                // Add trail point if touch is active and particle has moved
                if (touchActive && (Math.abs(this.x - this.lastX) > 0.5 || Math.abs(this.y - this.lastY) > 0.5)) {
                    this.trailX.push(this.x);
                    this.trailY.push(this.y);
                    this.trailLife.push(0.8);

                    // Keep trail limited to last 5 points
                    if (this.trailX.length > 5) {
                        this.trailX.shift();
                        this.trailY.shift();
                        this.trailLife.shift();
                    }
                }

                // Fade trail
                for (let i = 0; i < this.trailLife.length; i++) {
                    this.trailLife[i] *= 0.85;
                }

                this.lastX = this.x;
                this.lastY = this.y;
            }

            draw(ctx, centerX, centerY, hue) {
                // Draw trail
                for (let i = 0; i < this.trailX.length; i++) {
                    if (this.trailLife[i] > 0.05) {
                        ctx.fillStyle = \`hsla(\${hue}, 100%, 65%, \${this.trailLife[i] * 0.2})\`;
                        ctx.beginPath();
                        ctx.arc(this.trailX[i], this.trailY[i], this.currentSize * 0.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // Draw particle
                ctx.fillStyle = \`hsla(\${hue}, 100%, 65%, \${0.3 + Math.sin(this.phase) * 0.3})\`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.currentSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const particles = Array.from({ length: CONFIG.numParticles }, () => new Particle());

        // === Audio Data Generation ===
        function generateAudioData(time, beatPattern) {
            const data = new Array(CONFIG.numBars);

            // Multiple sine waves at different frequencies
            const freq1 = Math.sin(time * 0.5) * 2 + 3;
            const freq2 = Math.sin(time * 0.3) * 1.5 + 2.5;
            const freq3 = Math.sin(time * 0.7) * 1 + 1.5;

            for (let i = 0; i < CONFIG.numBars; i++) {
                const angle = (i / CONFIG.numBars) * Math.PI * 2;

                // Base sine waves
                let value = Math.sin(time * freq1 + angle * 0.3) * 0.4;
                value += Math.sin(time * freq2 + angle * 0.6) * 0.3;
                value += Math.sin(time * freq3 + angle) * 0.2;

                // Beat pattern modulation
                const beatFreq = beatPattern % 4 < 2 ? 2 : 3;
                value *= (0.7 + Math.sin(time * beatFreq) * 0.3);

                // Bass boost: indices 0-8 and 56-63 have higher amplitude
                if (i < 8 || i >= 56) {
                    value *= 1.3;
                }

                // Beat drop every ~8 seconds: spike all bars briefly
                const beatDropCycle = (time % 8);
                if (beatDropCycle > 7.7 && beatDropCycle < 8.0) {
                    const dropIntensity = Math.sin((beatDropCycle - 7.7) / 0.3 * Math.PI);
                    value = Math.max(value, dropIntensity * 0.9);
                    state.beatDropIntensity = dropIntensity;
                }

                // Small random jitter
                value += (Math.random() - 0.5) * 0.1;

                // Smooth and clamp
                data[i] = Math.max(0, Math.min(1, (value + 1) / 2));
            }

            return data;
        }

        // === Smooth Audio Data Interpolation ===
        function smoothAudioData(newData, oldData, factor = 0.15) {
            if (!oldData) return newData;
            const smoothed = new Array(CONFIG.numBars);
            for (let i = 0; i < CONFIG.numBars; i++) {
                smoothed[i] = oldData[i] * (1 - factor) + newData[i] * factor;
            }
            return smoothed;
        }

        // === Drawing Functions ===
        function drawBackground() {
            const gradient = ctx.createRadialGradient(
                CONFIG.centerX, CONFIG.centerY, 0,
                CONFIG.centerX, CONFIG.centerY,
                Math.sqrt(CONFIG.centerX ** 2 + CONFIG.centerY ** 2)
            );

            const hue = state.colors.hue;
            gradient.addColorStop(0, \`hsla(\${hue}, 40%, 15%, 1)\`);
            gradient.addColorStop(0.5, \`hsla(\${hue - 20}, 30%, 8%, 1)\`);
            gradient.addColorStop(1, \`hsla(\${hue - 40}, 20%, 5%, 1)\`);

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // === Draw Outer Glow Ring ===
        function drawOuterGlowRing(amplitude) {
            const glowRadius = CONFIG.baseRadius + CONFIG.barMaxLength * 0.8;
            const hue = state.colors.hue;

            // Create large radial gradient for glow effect
            const glowGradient = ctx.createRadialGradient(
                CONFIG.centerX, CONFIG.centerY, glowRadius * 0.8,
                CONFIG.centerX, CONFIG.centerY, glowRadius * 1.5
            );

            const glowOpacity = 0.15 * amplitude;
            glowGradient.addColorStop(0, \`hsla(\${hue}, 80%, 50%, \${glowOpacity})\`);
            glowGradient.addColorStop(1, \`hsla(\${hue}, 80%, 50%, 0)\`);

            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(CONFIG.centerX, CONFIG.centerY, glowRadius * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        function drawVisualizerRing(audioData, amplitude) {
            const barRadius = CONFIG.baseRadius;
            const maxBarLength = CONFIG.barMaxLength;

            for (let i = 0; i < CONFIG.numBars; i++) {
                const angle = (i / CONFIG.numBars) * Math.PI * 2 - Math.PI / 2;

                // Bar height from audio data + amplitude boost
                let barHeight = audioData[i] * amplitude * maxBarLength;

                // Add touch reaction
                if (state.touchActive) {
                    barHeight *= (1 + state.touchAmplitude * 0.5);
                }

                const startX = CONFIG.centerX + Math.cos(angle) * barRadius;
                const startY = CONFIG.centerY + Math.sin(angle) * barRadius;
                const endX = CONFIG.centerX + Math.cos(angle) * (barRadius + barHeight);
                const endY = CONFIG.centerY + Math.sin(angle) * (barRadius + barHeight);

                // Color gradient based on bar index
                const hue = (state.colors.hue + (i / CONFIG.numBars) * 60) % 360;
                const saturation = 70 + Math.sin(state.time + i * 0.1) * 20;
                const lightness = 50 + Math.sin(state.time * 2 + i * 0.05) * 10;

                const barColor = \`hsl(\${hue}, \${saturation}%, \${lightness}%)\`;

                // Draw bar with glow (thicker bars with rounded caps)
                ctx.strokeStyle = barColor;
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.globalAlpha = 0.8;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Inner mirror reflection (shorter, more transparent)
                const reflectionHeight = barHeight * 0.4;
                const reflectEndX = CONFIG.centerX + Math.cos(angle) * (barRadius - reflectionHeight);
                const reflectEndY = CONFIG.centerY + Math.sin(angle) * (barRadius - reflectionHeight);
                ctx.strokeStyle = barColor;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.15;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(reflectEndX, reflectEndY);
                ctx.stroke();

                // Glow effect
                ctx.strokeStyle = barColor;
                ctx.lineWidth = 6;
                ctx.globalAlpha = 0.15;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                ctx.globalAlpha = 1;
            }
        }

        function drawCenterContent() {
            const radius = CONFIG.baseRadius;

            // Center circle background
            const gradient = ctx.createRadialGradient(
                CONFIG.centerX, CONFIG.centerY, 0,
                CONFIG.centerX, CONFIG.centerY, radius * 1.2
            );
            const hue = state.colors.hue;
            gradient.addColorStop(0, \`hsla(\${hue}, 60%, 25%, 0.6)\`);
            gradient.addColorStop(1, \`hsla(\${hue}, 40%, 10%, 0.3)\`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(CONFIG.centerX, CONFIG.centerY, radius * 1.1, 0, Math.PI * 2);
            ctx.fill();

            // Border
            ctx.strokeStyle = \`hsla(\${hue}, 80%, 60%, 0.4)\`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Rotating arc ring around center
            const arcRadius = radius * 0.75;
            const arcRotation = state.time * 0.5; // Slow rotation
            ctx.strokeStyle = \`hsla(\${hue}, 70%, 50%, 0.3)\`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 8]);
            ctx.beginPath();
            ctx.arc(CONFIG.centerX, CONFIG.centerY, arcRadius, arcRotation, arcRotation + Math.PI * 1.5);
            ctx.stroke();
            ctx.setLineDash([]);

            // Text styling
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';

            // "正在播放"
            ctx.fillStyle = 'rgba(200, 200, 220, 0.7)';
            ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText('正在播放', CONFIG.centerX, CONFIG.centerY - 35);

            // Song name
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText('夜空中最亮的星', CONFIG.centerX, CONFIG.centerY);

            // Artist
            ctx.fillStyle = 'rgba(200, 200, 220, 0.7)';
            ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText('逃跑计划', CONFIG.centerX, CONFIG.centerY + 25);

            // Play icon (decorative) with mini EQ bars next to it
            const playX = CONFIG.centerX - 15;
            const playY = CONFIG.centerY + 50;
            ctx.fillStyle = 'rgba(200, 200, 220, 0.6)';
            ctx.beginPath();
            ctx.moveTo(playX, playY - 6);
            ctx.lineTo(playX, playY + 6);
            ctx.lineTo(playX + 8, playY);
            ctx.fill();

            // Mini EQ bars (3 small bars next to play icon)
            if (state.smoothAudioData) {
                const eqX = playX + 18;
                const eqY = playY;
                const eqBarWidth = 2;
                const eqSpacing = 4;
                const eqIndices = [8, 32, 56]; // Bass, mid, treble

                eqIndices.forEach((idx, i) => {
                    const eqValue = state.smoothAudioData[idx] * 8;
                    const barX = eqX + i * eqSpacing;
                    const barTop = eqY - eqValue / 2;
                    const barHeight = eqValue;

                    ctx.fillStyle = \`hsla(\${hue}, 80%, 60%, 0.6)\`;
                    ctx.fillRect(barX, barTop, eqBarWidth, barHeight);
                });
            }
        }

        function drawTimeline(audioData) {
            const songDuration = 252; // 4:12 in seconds
            const songTime = state.time % songDuration;

            const timelineY = CONFIG.centerY + CONFIG.baseRadius * 1.3 + 40;
            const timelineWidth = Math.min(canvas.width * 0.6, 300);
            const timelineX = CONFIG.centerX - timelineWidth / 2;
            const timelineHeight = 3;

            // Background bar
            ctx.fillStyle = 'rgba(100, 100, 120, 0.3)';
            ctx.fillRect(timelineX, timelineY, timelineWidth, timelineHeight);

            // Progress (fixed to use actual song duration)
            const progress = songTime / songDuration;
            const progressWidth = timelineWidth * progress;

            const hue = state.colors.hue;
            ctx.fillStyle = \`hsl(\${hue}, 70%, 55%)\`;
            ctx.fillRect(timelineX, timelineY, progressWidth, timelineHeight);

            // Time text (fixed to show correct minutes and seconds)
            ctx.fillStyle = 'rgba(200, 200, 220, 0.7)';
            ctx.textAlign = 'center';
            ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
            const currentMin = Math.floor(songTime / 60);
            const currentSec = Math.floor(songTime % 60);
            const currentStr = \`\${currentMin}:\${String(currentSec).padStart(2, '0')}\`;
            ctx.fillText(currentStr + ' / 4:12', CONFIG.centerX, timelineY + 20);
        }

        // === Input Handling ===
        function handleTouchStart(e) {
            state.touchActive = true;
            state.touchAmplitude = 1.0;
            state.colors.hueAtTouchStart = state.colors.hue;
            state.rippleRadius = 0;
            state.rippleOpacity = 0.8;

            // Get touch/mouse position for ripple
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            state.rippleX = clientX - rect.left;
            state.rippleY = clientY - rect.top;
        }

        function handleTouchEnd() {
            state.touchActive = false;
        }

        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchend', handleTouchEnd);
        canvas.addEventListener('mousedown', handleTouchStart);
        canvas.addEventListener('mouseup', handleTouchEnd);

        // === Draw Ripple Effect ===
        function drawRipple() {
            if (state.rippleOpacity > 0.01 && state.rippleX !== undefined) {
                const maxRippleRadius = 150;
                state.rippleRadius += 3;
                state.rippleOpacity *= 0.92;

                if (state.rippleRadius < maxRippleRadius) {
                    ctx.strokeStyle = \`hsla(\${state.colors.hue}, 80%, 60%, \${state.rippleOpacity})\`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(state.rippleX, state.rippleY, state.rippleRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }

        // === Animation Loop ===
        function animate() {
            state.time += 0.016; // ~60fps

            // Update beat pattern every 4 seconds
            state.beatPattern = Math.floor(state.time / 4);

            // Slowly rotate hue
            let hue = (280 + state.time * 5) % 360;

            // Shift toward warmer hue during touch
            if (state.touchActive) {
                const warmShift = state.touchAmplitude * 30;
                hue = (hue + warmShift) % 360;
            }
            state.colors.hue = hue;

            // Spring back touch amplitude
            state.touchAmplitude *= 0.95;

            // Generate and normalize audio data
            const rawAudioData = generateAudioData(state.time, state.beatPattern);

            // Smooth interpolation of audio data
            if (!state.smoothAudioData) {
                state.smoothAudioData = rawAudioData;
            } else {
                state.smoothAudioData = smoothAudioData(rawAudioData, state.smoothAudioData);
            }

            const totalAmplitude = state.baseAmplitude + state.touchAmplitude * 0.3;

            // Update particles with trail support
            particles.forEach(p => p.update(state.time, totalAmplitude, state.touchActive));

            // Draw frame
            drawBackground();

            // Draw outer glow ring
            drawOuterGlowRing(totalAmplitude);

            // Draw particles (behind)
            particles.forEach(p => p.draw(ctx, CONFIG.centerX, CONFIG.centerY, state.colors.hue));

            // Draw visualizer ring
            drawVisualizerRing(state.smoothAudioData, totalAmplitude);

            // Draw center content
            drawCenterContent();

            // Draw ripple effect
            drawRipple();

            // Draw timeline
            drawTimeline(state.smoothAudioData);

            requestAnimationFrame(animate);
        }

        animate();
    </script>
</body>
</html>`;

// ─────────────────────────────────────────────
// 21-magnetic-poetry
// ─────────────────────────────────────────────
export const PREFAB_MAGNETIC_POETRY = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>歌词拼图 · Glint Lockscreen</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            background: linear-gradient(135deg, #1a1f3a 0%, #2d1b4e 50%, #1a1a2e 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif;
        }

        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }

        #overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
        }

        .title {
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 16px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.7);
            letter-spacing: 2px;
        }

        .progress {
            position: absolute;
            top: 50px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 14px;
            color: rgba(255, 255, 255, 0.5);
            letter-spacing: 1px;
        }

        .footer {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 12px;
            color: rgba(255, 255, 255, 0.3);
            letter-spacing: 1px;
        }

        .completion-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            z-index: 100;
            pointer-events: all;
        }

        .completion-overlay.show {
            display: flex;
        }

        .completion-content {
            text-align: center;
            color: white;
        }

        .completion-emoji {
            font-size: 60px;
            margin-bottom: 20px;
            animation: bounce 1s ease-in-out infinite;
        }

        .completion-text {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 30px;
            color: #ffd700;
        }

        .completion-lyrics {
            max-width: 80vw;
            font-size: 16px;
            line-height: 1.8;
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 40px;
            font-style: italic;
        }

        .replay-button {
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .replay-button:hover {
            transform: scale(1.05);
        }

        .replay-button:active {
            transform: scale(0.98);
        }

        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }

        @keyframes glow {
            0%, 100% { filter: drop-shadow(0 0 5px #ffd700); }
            50% { filter: drop-shadow(0 0 15px #ffd700); }
        }
    </style>
</head>
<body>
    <canvas id="canvas"></canvas>
    <div id="overlay">
        <div class="title">🎵 歌词拼图</div>
        <div class="progress">第 <span id="current-line">1</span>/5 句</div>
        <div class="footer">GLINT · 灵犀</div>
    </div>
    <div class="completion-overlay" id="completion">
        <div class="completion-content">
            <div class="completion-emoji">🎵</div>
            <div class="completion-text">完成！</div>
            <div class="completion-lyrics" id="completion-lyrics"></div>
            <button class="replay-button" onclick="location.reload()">再玩一次</button>
        </div>
    </div>

    <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        // Responsive canvas
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Lyric data: each line with its tiles
        const lyrics = [
            { line: '夜空中最亮的星', tiles: ['夜空中', '最亮的', '星'] },
            { line: '能否听清', tiles: ['能否', '听清'] },
            { line: '那仰望的人', tiles: ['那', '仰望的', '人'] },
            { line: '心底的孤独和叹息', tiles: ['心底的', '孤独', '和', '叹息'] },
            { line: '我祈祷拥有一颗透明的心灵', tiles: ['我祈祷', '拥有', '一颗', '透明的', '心灵'] }
        ];

        const allLyrics = lyrics.map(l => l.line).join('\n');

        // Pastel/gradient colors for tiles
        const colors = [
            '#FF6B9D', // pink
            '#C44569', // dark pink
            '#A8E6CF', // mint
            '#56CCF2', // cyan
            '#BB6BD9', // purple
            '#F2994E', // orange
            '#F2C94C', // gold
            '#EB5757'  // red
        ];

        // Music note decoration particles
        const musicNotes = ['♪', '♫', '♬', '🎵'];

        // Game state
        let currentLineIndex = 0;
        let gameComplete = false;

        // Floating particle class
        class FloatingNote {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = canvas.height + 50;
                this.vx = (Math.random() - 0.5) * 1;
                this.vy = -(Math.random() * 0.5 + 0.3);
                this.opacity = 0.1;
                this.life = 8000; // 8 seconds
                this.age = 0;
                this.char = musicNotes[Math.floor(Math.random() * musicNotes.length)];
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.age += 16;
                this.opacity = 0.15 * Math.max(0, 1 - this.age / this.life);
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.font = 'bold 32px Arial';
                ctx.textAlign = 'center';
                ctx.fillStyle = 'white';
                ctx.fillText(this.char, this.x, this.y);
                ctx.restore();
            }

            isDead() {
                return this.age > this.life;
            }
        }

        // Confetti particle
        class Confetti {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 8;
                this.vy = Math.random() * -6 - 2;
                this.life = 1200;
                this.age = 0;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotationSpeed = (Math.random() - 0.5) * 0.3;
                this.size = Math.random() * 8 + 4;
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.3; // gravity
                this.rotation += this.rotationSpeed;
                this.age += 16;
            }

            draw() {
                const progress = this.age / this.life;
                const opacity = Math.max(0, 1 - progress);
                ctx.save();
                ctx.globalAlpha = opacity;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.fillStyle = this.color;
                ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
                ctx.restore();
            }

            isDead() {
                return this.age > this.life;
            }
        }

        // Tile class
        class Tile {
            constructor(text, index, totalTiles) {
                this.text = text;
                this.index = index;
                this.totalTiles = totalTiles;
                this.color = colors[index % colors.length];
                this.width = 0; // Will be measured from text
                this.height = 44;
                this.isDragging = false;
                this.isPlaced = false;
                this.dragOffsetX = 0;
                this.dragOffsetY = 0;
                this.scale = 1;
                this.targetScale = 1;
                this.correctSlotIndex = index;
                this.currentSlotIndex = null;
                this.feedbackTimer = 0;
                this.feedbackType = null; // 'correct' or 'wrong'

                // Scatter tiles in lower 60% of screen
                this.x = Math.random() * (canvas.width * 0.8) + canvas.width * 0.1;
                this.y = canvas.height * 0.45 + Math.random() * (canvas.height * 0.45);
            }

            contains(px, py) {
                return px > this.x - this.width / 2 && px < this.x + this.width / 2 &&
                       py > this.y - this.height / 2 && py < this.y + this.height / 2;
            }

            draw() {
                ctx.save();

                // Feedback animation
                if (this.feedbackTimer > 0) {
                    if (this.feedbackType === 'wrong') {
                        const bounce = Math.sin(this.feedbackTimer / 50) * 5;
                        this.x += bounce;
                    }
                    this.feedbackTimer -= 16;
                }

                // Shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = this.isDragging ? 15 : 8;
                ctx.shadowOffsetY = this.isDragging ? 8 : 4;

                // Background gradient
                const gradient = ctx.createLinearGradient(
                    this.x - this.width / 2, this.y - this.height / 2,
                    this.x + this.width / 2, this.y + this.height / 2
                );
                gradient.addColorStop(0, this.color);
                gradient.addColorStop(1, this.adjustColor(this.color, -20));

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.roundRect(
                    this.x - this.width / 2,
                    this.y - this.height / 2,
                    this.width,
                    this.height,
                    8
                );
                ctx.fill();

                // Border
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Text
                ctx.fillStyle = 'white';
                ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC"';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'transparent';

                // Measure text width
                const metrics = ctx.measureText(this.text);
                this.width = Math.max(metrics.width + 24, 60);

                ctx.fillText(this.text, this.x, this.y);

                ctx.restore();
            }

            adjustColor(color, amount) {
                const hex = color.replace('#', '');
                const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
                const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
                const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
                return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
            }

            update() {
                this.scale += (this.targetScale - this.scale) * 0.12;
            }
        }

        // Slot class
        class Slot {
            constructor(index, totalSlots) {
                this.index = index;
                this.totalSlots = totalSlots;
                this.width = 100;
                this.height = 50;
                this.occupied = false;
                this.tileIndex = null;

                // Position in top area
                const padding = 40;
                const availableWidth = canvas.width - padding * 2;
                const spacing = availableWidth / (totalSlots + 1);
                this.x = padding + spacing * (index + 1);
                this.y = 100;
            }

            draw() {
                ctx.save();

                // Outline
                ctx.strokeStyle = this.occupied ? '#ffd700' : 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = this.occupied ? 3 : 2;
                ctx.beginPath();
                ctx.roundRect(
                    this.x - this.width / 2,
                    this.y - this.height / 2,
                    this.width,
                    this.height,
                    6
                );
                ctx.stroke();

                // Glow if occupied
                if (this.occupied) {
                    ctx.shadowColor = '#ffd700';
                    ctx.shadowBlur = 15;
                    ctx.strokeStyle = '#ffd700';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                ctx.restore();
            }

            contains(x, y) {
                return x > this.x - this.width / 2 && x < this.x + this.width / 2 &&
                       y > this.y - this.height / 2 && y < this.y + this.height / 2;
            }
        }

        // Game state
        let tiles = [];
        let slots = [];
        let floatingNotes = [];
        let confetti = [];
        let draggedTile = null;
        let lineCompleted = false;

        function initLine(lineIndex) {
            currentLineIndex = lineIndex;
            lineCompleted = false;
            const lyricData = lyrics[lineIndex];

            // Create slots
            slots = [];
            for (let i = 0; i < lyricData.tiles.length; i++) {
                slots.push(new Slot(i, lyricData.tiles.length));
            }

            // Create tiles (shuffled)
            tiles = [];
            const shuffled = [...lyricData.tiles].sort(() => Math.random() - 0.5);

            // BUG FIX 1: Track original tile indices to handle duplicates correctly
            const takenOriginalIndices = [];
            shuffled.forEach((text, i) => {
                let originalIndex = -1;
                for (let j = 0; j < lyricData.tiles.length; j++) {
                    if (lyricData.tiles[j] === text && !takenOriginalIndices.includes(j)) {
                        originalIndex = j;
                        takenOriginalIndices.push(j);
                        break;
                    }
                }
                const tile = new Tile(text, i, shuffled.length);
                tile.correctSlotIndex = originalIndex;
                tiles.push(tile);
            });

            // Improve slot sizing: dynamically set slot width based on tile text
            for (let i = 0; i < slots.length; i++) {
                const tileText = lyricData.tiles[i];
                const estimatedWidth = tileText.length * 12 + 24;
                slots[i].width = Math.max(estimatedWidth, 80);
            }

            document.getElementById('current-line').textContent = lineIndex + 1;
        }

        function checkLineComplete() {
            return slots.every(slot => slot.occupied);
        }

        function completeLineWithFeedback() {
            if (lineCompleted) return;
            lineCompleted = true;

            // Create confetti
            for (let i = 0; i < 30; i++) {
                const slot = slots[i % slots.length];
                confetti.push(new Confetti(slot.x, slot.y));
            }

            // Delay next line
            setTimeout(() => {
                if (currentLineIndex < lyrics.length - 1) {
                    initLine(currentLineIndex + 1);
                } else {
                    // Game complete!
                    gameComplete = true;
                    showCompletion();
                }
            }, 1500);
        }

        function showCompletion() {
            document.getElementById('completion-lyrics').textContent = allLyrics;
            document.getElementById('completion').classList.add('show');
        }

        function getTouchPos(e) {
            const rect = canvas.getBoundingClientRect();
            // BUG FIX 2: Handle touchend where e.touches is empty by using changedTouches
            const touch = (e.touches && e.touches.length > 0) ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e);
            return {
                x: (touch.clientX - rect.left) * (canvas.width / rect.width),
                y: (touch.clientY - rect.top) * (canvas.height / rect.height)
            };
        }

        canvas.addEventListener('mousedown', (e) => {
            if (gameComplete) return;
            const pos = getTouchPos(e);

            for (let i = tiles.length - 1; i >= 0; i--) {
                if (tiles[i].contains(pos.x, pos.y) && !tiles[i].isPlaced) {
                    draggedTile = tiles[i];
                    draggedTile.isDragging = true;
                    draggedTile.targetScale = 1.08;
                    draggedTile.dragOffsetX = pos.x - draggedTile.x;
                    draggedTile.dragOffsetY = pos.y - draggedTile.y;
                    break;
                }
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (draggedTile && !gameComplete) {
                const pos = getTouchPos(e);
                draggedTile.x = pos.x - draggedTile.dragOffsetX;
                draggedTile.y = pos.y - draggedTile.dragOffsetY;
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            if (draggedTile && !gameComplete) {
                draggedTile.isDragging = false;
                draggedTile.targetScale = 1;

                let placed = false;

                // Check if near a slot
                // BUG FIX 3: Use tile's current position instead of finger position for snap distance
                for (let slot of slots) {
                    const dx = draggedTile.x - slot.x;
                    const dy = draggedTile.y - slot.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 80 && !slot.occupied) {
                        // Check if correct (using correctSlotIndex, not shuffled index)
                        if (draggedTile.correctSlotIndex === slot.index) {
                            draggedTile.isPlaced = true;
                            draggedTile.x = slot.x;
                            draggedTile.y = slot.y;
                            draggedTile.currentSlotIndex = slot.index;
                            slot.occupied = true;
                            slot.tileIndex = tiles.indexOf(draggedTile);
                            placed = true;

                            // Add floating notes
                            for (let i = 0; i < 3; i++) {
                                floatingNotes.push(new FloatingNote());
                            }

                            if (checkLineComplete()) {
                                completeLineWithFeedback();
                            }
                        } else {
                            // Wrong slot - bounce back
                            draggedTile.feedbackTimer = 150;
                            draggedTile.feedbackType = 'wrong';
                        }
                        break;
                    }
                }

                draggedTile = null;
            }
        });

        canvas.addEventListener('touchstart', (e) => {
            if (gameComplete) return;
            e.preventDefault();
            const pos = getTouchPos(e);

            for (let i = tiles.length - 1; i >= 0; i--) {
                if (tiles[i].contains(pos.x, pos.y) && !tiles[i].isPlaced) {
                    draggedTile = tiles[i];
                    draggedTile.isDragging = true;
                    draggedTile.targetScale = 1.08;
                    draggedTile.dragOffsetX = pos.x - draggedTile.x;
                    draggedTile.dragOffsetY = pos.y - draggedTile.y;
                    break;
                }
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            if (draggedTile && !gameComplete) {
                e.preventDefault();
                const pos = getTouchPos(e);
                draggedTile.x = pos.x - draggedTile.dragOffsetX;
                draggedTile.y = pos.y - draggedTile.dragOffsetY;
            }
        });

        canvas.addEventListener('touchend', (e) => {
            if (draggedTile && !gameComplete) {
                e.preventDefault();
                draggedTile.isDragging = false;
                draggedTile.targetScale = 1;

                let placed = false;

                for (let slot of slots) {
                    // BUG FIX 3: Use tile's current position instead of finger position for snap distance
                    const dx = draggedTile.x - slot.x;
                    const dy = draggedTile.y - slot.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 80 && !slot.occupied) {
                        // Check if correct (using correctSlotIndex, not shuffled index)
                        if (draggedTile.correctSlotIndex === slot.index) {
                            draggedTile.isPlaced = true;
                            draggedTile.x = slot.x;
                            draggedTile.y = slot.y;
                            draggedTile.currentSlotIndex = slot.index;
                            slot.occupied = true;
                            slot.tileIndex = tiles.indexOf(draggedTile);
                            placed = true;

                            for (let i = 0; i < 3; i++) {
                                floatingNotes.push(new FloatingNote());
                            }

                            if (checkLineComplete()) {
                                completeLineWithFeedback();
                            }
                        } else {
                            draggedTile.feedbackTimer = 150;
                            draggedTile.feedbackType = 'wrong';
                        }
                        break;
                    }
                }

                draggedTile = null;
            }
        });

        // Initialize first line
        initLine(0);

        // Animation loop
        function animate() {
            // Clear with gradient background
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#1a1f3a');
            gradient.addColorStop(0.5, '#2d1b4e');
            gradient.addColorStop(1, '#1a1a2e');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw floating music notes
            floatingNotes.forEach((note, i) => {
                note.update();
                note.draw();
                if (note.isDead()) {
                    floatingNotes.splice(i, 1);
                }
            });

            // Draw slots
            slots.forEach(slot => {
                slot.draw();
            });

            // Draw tiles
            tiles.forEach(tile => {
                tile.update();
                tile.draw();
            });

            // Draw confetti
            confetti.forEach((particle, i) => {
                particle.update();
                particle.draw();
                if (particle.isDead()) {
                    confetti.splice(i, 1);
                }
            });

            requestAnimationFrame(animate);
        }

        animate();
    </script>
</body>
</html>`;

// ─────────────────────────────────────────────
// 22-constellation
// ─────────────────────────────────────────────
export const PREFAB_CONSTELLATION = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>连星座 — Glint Lockscreen Demo</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            background: #0a0e27;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
        }

        canvas {
            display: block;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1428 100%);
        }

        .ui-footer {
            position: fixed;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            text-align: center;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.4);
            letter-spacing: 2px;
            font-weight: 300;
            pointer-events: none;
        }

        .counter {
            position: fixed;
            top: 40px;
            right: 30px;
            font-size: 14px;
            color: rgba(255, 215, 100, 0.8);
            font-weight: 300;
            letter-spacing: 1px;
            pointer-events: none;
        }

        .instruction {
            position: fixed;
            bottom: 120px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 11px;
            color: rgba(255, 255, 255, 0.3);
            letter-spacing: 1px;
            pointer-events: none;
            opacity: 0;
            animation: fadeInOut 3s ease-in-out infinite;
        }

        @keyframes fadeInOut {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
        }
    </style>
</head>
<body>
    <canvas id="canvas"></canvas>
    <div class="counter" id="counter">已连 0 颗星</div>
    <div class="instruction">轻点或拖拽在星星之间画线</div>
    <div class="ui-footer">GLINT · 画你的星座</div>

    <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        let animationFrameId = null;

        // Resize canvas to fill window
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // ==================== Star Data ====================
        const stars = [];
        const constellations = [];
        const shootingStars = [];
        const connectedStarCount = { value: 0 };

        const STAR_COUNT = 45;
        const BRIGHT_STAR_COUNT = 6;
        const ACTIVATION_RADIUS = 30;
        const CONSTELLATION_NAMES = ['北辰', '织女', '归途', '初心', '远方', '沙漠', '灯塔', '月下', '星河', '永恒'];

        // Initialize stars
        function initStars() {
            stars.length = 0;
            for (let i = 0; i < STAR_COUNT; i++) {
                const isBright = i < BRIGHT_STAR_COUNT;
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: isBright ? 6 + Math.random() * 2 : 2 + Math.random() * 3,
                    brightness: 0.5 + Math.random() * 0.5,
                    twinklePhase: Math.random() * Math.PI * 2,
                    twinkleSpeed: 0.01 + Math.random() * 0.02,
                    isBright: isBright,
                    isActivated: false,
                    connections: [],
                    pulsePhase: 0
                });
            }
        }
        initStars();

        // ==================== Input Handling ====================
        let currentStar = null;
        let isDrawing = false;
        let mouseX = 0;
        let mouseY = 0;

        function getStarAtPosition(x, y) {
            for (let i = stars.length - 1; i >= 0; i--) {
                const star = stars[i];
                const dist = Math.hypot(star.x - x, star.y - y);
                if (dist < ACTIVATION_RADIUS) {
                    return star;
                }
            }
            return null;
        }

        function onPointerDown(e) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            mouseX = x;
            mouseY = y;

            const star = getStarAtPosition(x, y);
            if (star) {
                currentStar = star;
                isDrawing = true;
                star.isActivated = true;
            }
        }

        function onPointerMove(e) {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;

            if (!isDrawing) {
                // Update activation state for nearby stars
                stars.forEach(star => {
                    const dist = Math.hypot(star.x - mouseX, star.y - mouseY);
                    star.isActivated = dist < ACTIVATION_RADIUS;
                });
            }
        }

        function onPointerUp(e) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (isDrawing && currentStar) {
                const targetStar = getStarAtPosition(x, y);

                if (targetStar && targetStar !== currentStar) {
                    // Create connection
                    const startIdx = stars.indexOf(currentStar);
                    const endIdx = stars.indexOf(targetStar);

                    if (startIdx !== -1 && endIdx !== -1) {
                        // Avoid duplicates
                        if (!currentStar.connections.includes(endIdx)) {
                            currentStar.connections.push(endIdx);
                        }
                        if (!targetStar.connections.includes(startIdx)) {
                            targetStar.connections.push(startIdx);
                        }

                        connectedStarCount.value = countConnectedStars();
                        checkForConstellations();
                    }
                } else if (!targetStar) {
                    // Create shooting star at click position
                    createShootingStar(currentStar.x, currentStar.y, x, y);
                }
            }

            isDrawing = false;
            currentStar = null;
            stars.forEach(star => star.isActivated = false);
        }

        canvas.addEventListener('mousedown', onPointerDown);
        canvas.addEventListener('mousemove', onPointerMove);
        canvas.addEventListener('mouseup', onPointerUp);
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            onPointerDown(touch);
        });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            onPointerMove(touch);
        });
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            onPointerUp(touch);
        });

        // ==================== Shooting Star ====================
        function createShootingStar(fromX, fromY, toX, toY) {
            const angle = Math.atan2(toY - fromY, toX - fromX);
            const speed = 8;
            shootingStars.push({
                x: fromX,
                y: fromY,
                angle: angle,
                speed: speed,
                length: 60,
                life: 1.0,
                decay: 0.02
            });
        }

        // ==================== Constellation Detection ====================
        function countConnectedStars() {
            const visited = new Set();
            stars.forEach((star, idx) => {
                if (star.connections.length > 0) {
                    visited.add(idx);
                }
            });
            return visited.size;
        }

        function checkForConstellations() {
            // Find all connected components with 3+ stars
            const visited = new Set();
            const newConstellations = [];

            function dfs(startIdx, component) {
                if (visited.has(startIdx)) return;
                visited.add(startIdx);
                component.push(startIdx);

                const star = stars[startIdx];
                star.connections.forEach(connIdx => {
                    dfs(connIdx, component);
                });
            }

            for (let i = 0; i < stars.length; i++) {
                if (!visited.has(i) && stars[i].connections.length > 0) {
                    const component = [];
                    dfs(i, component);
                    if (component.length >= 3) {
                        newConstellations.push({
                            starIndices: component,
                            name: CONSTELLATION_NAMES[Math.floor(Math.random() * CONSTELLATION_NAMES.length)],
                            created: Date.now(),
                            pulsePhase: 0
                        });
                    }
                }
            }

            // Add only new constellations
            newConstellations.forEach(newConst => {
                const isDuplicate = constellations.some(existing => {
                    const existingSet = new Set(existing.starIndices);
                    const newSet = new Set(newConst.starIndices);
                    return existingSet.size === newSet.size &&
                           [...existingSet].every(v => newSet.has(v));
                });
                if (!isDuplicate) {
                    constellations.push(newConst);
                }
            });
        }

        // ==================== Drawing ====================
        function drawNebula() {
            const gradient = ctx.createRadialGradient(
                canvas.width * 0.8, canvas.height * 0.2, 0,
                canvas.width * 0.8, canvas.height * 0.2, canvas.width * 0.6
            );
            gradient.addColorStop(0, 'rgba(138, 43, 226, 0.15)');
            gradient.addColorStop(0.5, 'rgba(75, 0, 130, 0.08)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        function drawStar(star, time) {
            const dx = star.x;
            const dy = star.y;
            const size = star.size;

            // Twinkling
            const twinkling = 0.5 + 0.5 * Math.sin(star.twinklePhase + time * star.twinkleSpeed);
            let opacity = star.brightness * twinkling;

            // Activation pulse
            if (star.isActivated) {
                opacity = Math.min(1, opacity + 0.3);
            }

            // Draw glow
            const glowGradient = ctx.createRadialGradient(dx, dy, 0, dx, dy, size * 3);
            glowGradient.addColorStop(0, \`rgba(255, 215, 100, \${opacity * 0.6})\`);
            glowGradient.addColorStop(1, 'rgba(255, 215, 100, 0)');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(dx, dy, size * 3, 0, Math.PI * 2);
            ctx.fill();

            // Draw core
            ctx.fillStyle = \`rgba(255, 240, 200, \${opacity})\`;
            ctx.beginPath();
            ctx.arc(dx, dy, size, 0, Math.PI * 2);
            ctx.fill();

            // Draw bright star sparkle
            if (star.isBright) {
                const sparkleSize = size * 0.5;
                ctx.strokeStyle = \`rgba(255, 250, 220, \${opacity * 0.8})\`;
                ctx.lineWidth = 1;

                // Horizontal line
                ctx.beginPath();
                ctx.moveTo(dx - size * 2.5, dy);
                ctx.lineTo(dx + size * 2.5, dy);
                ctx.stroke();

                // Vertical line
                ctx.beginPath();
                ctx.moveTo(dx, dy - size * 2.5);
                ctx.lineTo(dx, dy + size * 2.5);
                ctx.stroke();

                // Diagonal lines
                ctx.beginPath();
                ctx.moveTo(dx - size * 1.8, dy - size * 1.8);
                ctx.lineTo(dx + size * 1.8, dy + size * 1.8);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(dx + size * 1.8, dy - size * 1.8);
                ctx.lineTo(dx - size * 1.8, dy + size * 1.8);
                ctx.stroke();
            }
        }

        function drawConnections(time) {
            ctx.lineWidth = 1;

            stars.forEach((star, idx) => {
                star.connections.forEach(connIdx => {
                    if (connIdx > idx) { // Draw each line only once
                        const target = stars[connIdx];
                        const dist = Math.hypot(target.x - star.x, target.y - star.y);

                        // Glow line (thick, transparent)
                        ctx.strokeStyle = 'rgba(255, 215, 100, 0.15)';
                        ctx.lineWidth = 6;
                        ctx.beginPath();
                        ctx.moveTo(star.x, star.y);
                        ctx.lineTo(target.x, target.y);
                        ctx.stroke();

                        // Bright line
                        ctx.strokeStyle = 'rgba(255, 240, 180, 0.8)';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(star.x, star.y);
                        ctx.lineTo(target.x, target.y);
                        ctx.stroke();
                    }
                });
            });
        }

        function drawPreviewLine() {
            if (isDrawing && currentStar) {
                const dist = Math.hypot(mouseX - currentStar.x, mouseY - currentStar.y);

                // Glow
                ctx.strokeStyle = 'rgba(255, 215, 100, 0.2)';
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(currentStar.x, currentStar.y);
                ctx.lineTo(mouseX, mouseY);
                ctx.stroke();

                // Bright preview
                ctx.strokeStyle = 'rgba(255, 240, 180, 0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(currentStar.x, currentStar.y);
                ctx.lineTo(mouseX, mouseY);
                ctx.stroke();
            }
        }

        function drawShootingStars(time) {
            shootingStars.forEach((ss, idx) => {
                if (ss.life <= 0) {
                    shootingStars.splice(idx, 1);
                    return;
                }

                const trailLength = ss.length * ss.life;
                const endX = ss.x + Math.cos(ss.angle) * ss.speed * 60;
                const endY = ss.y + Math.sin(ss.angle) * ss.speed * 60;

                // Trail glow
                const gradient = ctx.createLinearGradient(ss.x, ss.y, endX, endY);
                gradient.addColorStop(0, \`rgba(255, 215, 100, \${ss.life * 0.8})\`);
                gradient.addColorStop(1, 'rgba(255, 215, 100, 0)');

                ctx.strokeStyle = gradient;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(ss.x, ss.y);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Bright core
                ctx.strokeStyle = \`rgba(255, 250, 220, \${ss.life})\`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(ss.x, ss.y);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                ss.life -= ss.decay;
            });
        }

        function drawConstellationLabels(time) {
            constellations.forEach(const_obj => {
                const ageMs = Date.now() - const_obj.created;
                if (ageMs > 8000) return; // Fade out after 8 seconds

                // Calculate label position (center of stars)
                let centerX = 0, centerY = 0;
                const_obj.starIndices.forEach(idx => {
                    centerX += stars[idx].x;
                    centerY += stars[idx].y;
                });
                centerX /= const_obj.starIndices.length;
                centerY /= const_obj.starIndices.length;

                // Pulse and fade
                const progress = ageMs / 8000;
                const opacity = Math.max(0, 1 - progress) * 0.8;
                const scale = 1 + Math.sin(time * 0.003) * 0.1;

                ctx.fillStyle = \`rgba(255, 215, 100, \${opacity})\`;
                ctx.font = \`\${14 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto\`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(const_obj.name, centerX, centerY - 30);
            });

            // Remove old constellations
            constellations.forEach((const_obj, idx) => {
                if (Date.now() - const_obj.created > 8000) {
                    constellations.splice(idx, 1);
                }
            });
        }

        // ==================== Animation Loop ====================
        let lastTime = Date.now();
        function animate() {
            const now = Date.now();
            const time = now - lastTime;

            // Clear canvas with gradient background
            const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            bgGradient.addColorStop(0, '#0a0e27');
            bgGradient.addColorStop(0.5, '#1a1f3a');
            bgGradient.addColorStop(1, '#0f1428');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw nebula
            drawNebula();

            // Draw all stars
            stars.forEach(star => drawStar(star, now));

            // Draw connections
            drawConnections(now);

            // Draw preview line
            drawPreviewLine();

            // Draw shooting stars
            drawShootingStars(now);

            // Draw constellation labels
            drawConstellationLabels(now);

            // Update counter
            const counter = document.getElementById('counter');
            counter.textContent = \`已连 \${connectedStarCount.value} 颗星\`;

            animationFrameId = requestAnimationFrame(animate);
        }

        animate();

        // Cleanup
        window.addEventListener('beforeunload', () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        });
    </script>
</body>
</html>`;

// ─────────────────────────────────────────────
// 23-space-shooter
// ─────────────────────────────────────────────
export const PREFAB_SPACE_SHOOTER = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>星际守卫 - Space Guardian</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: #0a0a12;
      font-family: 'Courier New', monospace;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
      position: fixed;
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
      background: #0a0a12;
    }

    .hud {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      pointer-events: none;
      font-size: 14px;
      color: #00ffff;
      text-shadow: 0 0 12px rgba(0, 255, 255, 0.6), 0 0 24px rgba(0, 255, 255, 0.2);
      font-weight: bold;
      z-index: 10;
    }

    .lives {
      display: flex;
      gap: 6px;
      font-size: 18px;
      letter-spacing: 4px;
    }

    .score {
      letter-spacing: 3px;
      font-size: 16px;
    }

    .combo {
      letter-spacing: 2px;
      font-size: 14px;
      color: #ffff00;
      text-shadow: 0 0 10px rgba(255, 255, 0, 0.6);
      margin-right: 20px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .combo.active {
      opacity: 1;
    }

    .wave {
      letter-spacing: 2px;
      font-size: 14px;
      color: #ff00ff;
      text-shadow: 0 0 10px rgba(255, 0, 255, 0.6);
    }

    .glint-footer {
      position: absolute;
      bottom: 4px;
      right: 12px;
      font-size: 10px;
      color: rgba(0, 255, 255, 0.15);
      letter-spacing: 1px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <canvas id="gameCanvas"></canvas>
  <div class="hud">
    <div>
      <div class="lives" id="lives"></div>
    </div>
    <div style="display: flex; gap: 30px;">
      <div class="wave" id="wave">WAVE 1</div>
      <div class="combo" id="combo"></div>
      <div class="score" id="score">SCORE 0000</div>
    </div>
  </div>
  <div class="glint-footer">GLINT</div>

  <script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const livesEl = document.getElementById('lives');
    const scoreEl = document.getElementById('score');
    const waveEl = document.getElementById('wave');
    const comboEl = document.getElementById('combo');

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Game state
    const game = {
      score: 0,
      lives: 3,
      gameOver: false,
      waveStartTime: 0,
      waveNum: 1,
      elapsedTime: 0,
      killCount: 0,
      lastKillTime: 0,
      comboCount: 0,
      maxCombo: 0,
      powerUpActive: null,
      powerUpEndTime: 0,
      screenShake: 0,
      gameStartTime: 0,
    };

    // Player ship
    const player = {
      x: canvas.width / 2,
      y: canvas.height * 0.85,
      speed: 6,
      lastFireTime: 0,
      fireRate: 100,
      shieldActive: false,
    };

    // Input handling
    const input = {
      touchActive: false,
      touchX: 0,
      mouseX: canvas.width / 2,
    };

    canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const y = touch.clientY - rect.top;
      if (y > canvas.height * 0.67) {
        input.touchActive = true;
        input.touchX = touch.clientX - rect.left;
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      if (input.touchActive) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        input.touchX = touch.clientX - rect.left;
      }
    });

    canvas.addEventListener('touchend', () => {
      input.touchActive = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      if (y > canvas.height * 0.67) {
        input.mouseX = e.clientX - rect.left;
      }
    });

    // Object pools
    const bullets = [];
    const enemies = [];
    const particles = [];
    const scorePopups = [];
    const waveAnnouncements = [];

    // Particle system
    function createExplosion(x, y, size = 1, color = '#00ffff') {
      const rings = Math.ceil(size * 3);
      for (let r = 0; r < rings; r++) {
        const particleCount = 8 + r * 4;
        for (let i = 0; i < particleCount; i++) {
          const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5);
          const speed = 2 + Math.random() * 4 + r * 0.5;
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.8,
            maxLife: 0.8,
            color,
            size: 1.5 + Math.random() * 1.5,
          });
        }
      }
    }

    function createScorePopup(x, y, text) {
      scorePopups.push({ x, y, text, life: 1.5, maxLife: 1.5 });
    }

    function createWaveAnnouncement(waveNum) {
      waveAnnouncements.push({
        waveNum,
        life: 2,
        maxLife: 2,
        scale: 0.5,
      });
    }

    // Bullet system
    function fireBullet() {
      const now = Date.now();
      if (now - player.lastFireTime < player.fireRate) return;
      player.lastFireTime = now;

      if (game.powerUpActive === 'triple') {
        const spread = 12;
        for (let i = -1; i <= 1; i++) {
          bullets.push({
            x: player.x + i * spread,
            y: player.y - 15,
            vx: i * 2,
            vy: -9,
            life: 5,
            type: 'triple',
          });
        }
      } else {
        bullets.push({
          x: player.x,
          y: player.y - 15,
          vx: 0,
          vy: -9,
          life: 5,
          type: 'single',
        });
      }
    }

    // Enemy spawning
    function spawnEnemy() {
      if (!game.lastSpawnTime) game.lastSpawnTime = Date.now();

      const waveTime = game.elapsedTime;
      const now = Date.now();

      let spawnRate = 1200;
      let enemyCount = 1;
      let speed = 1.8;
      let types = [0];

      if (waveTime > 45) {
        game.waveNum = 4;
        spawnRate = 600;
        enemyCount = 4;
        speed = 3.2;
        types = [0, 1, 2, 3];
      } else if (waveTime > 30) {
        game.waveNum = 3;
        spawnRate = 800;
        enemyCount = 3;
        speed = 2.8;
        types = [0, 1, 2];
      } else if (waveTime > 15) {
        game.waveNum = 2;
        spawnRate = 1000;
        enemyCount = 2;
        speed = 2.2;
        types = [0, 1];
      }

      // Occasional boss
      if (waveTime > 25 && Math.floor(waveTime) % 30 === 0 && now - game.lastBossTime > 25000) {
        game.lastBossTime = now;
        enemies.push({
          x: canvas.width / 2 + (Math.random() - 0.5) * 100,
          y: -60,
          vx: 0,
          vy: 1.2,
          type: 'boss',
          health: 8,
          maxHealth: 8,
          angle: 0,
          rotation: 0,
          shieldRotation: 0,
          shieldAlpha: 0.8,
        });
        return;
      }

      if (now - game.lastSpawnTime > spawnRate) {
        game.lastSpawnTime = now;
        for (let i = 0; i < enemyCount; i++) {
          const type = types[i % types.length];
          enemies.push({
            x: Math.random() * (canvas.width - 60) + 30,
            y: -40,
            type,
            vy: speed,
            vx: (i % 2 === 0 ? -0.6 : 0.6) * speed,
            health: type === 'boss' ? 5 : 1,
            maxHealth: type === 'boss' ? 5 : 1,
            angle: 0,
            rotation: Math.random() * Math.PI * 2,
            pulsing: 0,
          });
        }
      }
    }

    function spawnPowerUp(x, y) {
      const types = ['triple', 'shield'];
      const type = types[Math.floor(Math.random() * types.length)];
      const powerUp = {
        x, y,
        type,
        vy: 1.5,
        life: 8,
        rotation: 0,
      };
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 3,
        vy: -2 - Math.random() * 2,
        life: 1,
        maxLife: 1,
        color: '#0099ff',
        size: 2,
        isTrail: true,
      });
      game.powerUps = game.powerUps || [];
      game.powerUps.push(powerUp);
    }

    // Collision detection
    function checkCollisions() {
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
          const enemy = enemies[j];
          const dx = bullet.x - enemy.x;
          const dy = bullet.y - enemy.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const radius = enemy.type === 'boss' ? 28 : 16;

          if (dist < radius + 5) {
            enemy.health--;
            const killScore = enemy.type === 'boss' ? 50 : 10;
            game.score += killScore * (1 + Math.floor(game.comboCount / 2));
            game.killCount++;
            game.lastKillTime = Date.now();
            game.comboCount++;
            if (game.comboCount > game.maxCombo) game.maxCombo = game.comboCount;

            createScorePopup(enemy.x, enemy.y, \`+\${killScore}\`);

            if (enemy.type === 'boss') {
              game.screenShake = 15;
              createExplosion(enemy.x, enemy.y, 3, '#ffff00');
            } else {
              game.screenShake = Math.max(1, game.screenShake + 1);
              createExplosion(enemy.x, enemy.y, 1.5, ['#ff00ff', '#00ff00', '#ff8800', '#0099ff'][enemy.type]);
            }

            if (enemy.health <= 0) {
              if (Math.random() < 0.08) {
                spawnPowerUp(enemy.x, enemy.y);
              }
              enemies.splice(j, 1);
            }

            bullets.splice(i, 1);
            break;
          }
        }
      }

      // Power-up collection
      if (game.powerUps) {
        for (let i = game.powerUps.length - 1; i >= 0; i--) {
          const pu = game.powerUps[i];
          const dx = player.x - pu.x;
          const dy = player.y - pu.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 25) {
            if (pu.type === 'triple') {
              game.powerUpActive = 'triple';
              game.powerUpEndTime = Date.now() + 6000;
            } else if (pu.type === 'shield') {
              player.shieldActive = true;
              game.shieldEndTime = Date.now() + 5000;
            }
            game.powerUps.splice(i, 1);
          }
        }
      }

      // Enemy-player collision
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 25) {
          if (player.shieldActive) {
            player.shieldActive = false;
            createExplosion(player.x, player.y, 2, '#0099ff');
            game.screenShake = 8;
          } else {
            game.lives--;
            createExplosion(player.x, player.y, 2, '#ff0000');
            game.screenShake = 10;
            if (game.lives <= 0) {
              game.gameOver = true;
            }
          }
          enemies.splice(i, 1);
        }
      }
    }

    // Update loop
    function update() {
      if (game.gameOver) return;

      if (!game.gameStartTime) game.gameStartTime = Date.now();
      game.elapsedTime = (Date.now() - game.waveStartTime) / 1000;

      // Player movement
      const targetX = input.touchActive ? input.touchX : input.mouseX;
      const moveDir = targetX - player.x;
      if (Math.abs(moveDir) > 2) {
        player.x += Math.sign(moveDir) * player.speed;
      }
      player.x = Math.max(25, Math.min(canvas.width - 25, player.x));

      // Auto-fire
      fireBullet();

      // Spawn enemies
      spawnEnemy();

      // Update bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life -= 0.016;
        if (b.y < -10 || b.x < -10 || b.x > canvas.width + 10 || b.life <= 0) {
          bullets.splice(i, 1);
        }
      }

      // Update enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.type === 'boss') {
          e.angle += 0.02;
          e.rotation += 0.015;
          e.shieldRotation += 0.03;
          e.pulsing = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
        } else {
          e.rotation += 0.05;
          e.pulsing = Math.sin(Date.now() * 0.008 + e.x) * 0.2 + 0.8;
        }

        e.x += e.vx;
        e.y += e.vy;

        if (e.y > canvas.height) {
          game.lives--;
          enemies.splice(i, 1);
          if (game.lives <= 0) game.gameOver = true;
        }
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.016;
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }

      // Update power-ups
      if (game.powerUps) {
        for (let i = game.powerUps.length - 1; i >= 0; i--) {
          const pu = game.powerUps[i];
          pu.y += pu.vy;
          pu.rotation += 0.08;
          pu.life -= 0.016;
          if (pu.y > canvas.height || pu.life <= 0) {
            game.powerUps.splice(i, 1);
          }
        }
      }

      // Update announcements
      for (let i = waveAnnouncements.length - 1; i >= 0; i--) {
        const a = waveAnnouncements[i];
        a.life -= 0.016;
        a.scale = 0.3 + (1 - a.life / a.maxLife) * 1.2;
        if (a.life <= 0) waveAnnouncements.splice(i, 1);
      }

      // Update score popups
      for (let i = scorePopups.length - 1; i >= 0; i--) {
        const sp = scorePopups[i];
        sp.y -= 1.5;
        sp.life -= 0.016;
        if (sp.life <= 0) scorePopups.splice(i, 1);
      }

      // Power-up expiration
      if (game.powerUpActive && Date.now() > game.powerUpEndTime) {
        game.powerUpActive = null;
      }
      if (player.shieldActive && Date.now() > game.shieldEndTime) {
        player.shieldActive = false;
      }

      // Combo reset
      if (Date.now() - game.lastKillTime > 2000) {
        game.comboCount = 0;
      }

      // Screen shake decay
      if (game.screenShake > 0) {
        game.screenShake *= 0.92;
      }

      checkCollisions();
    }

    // Drawing functions
    function drawBackground() {
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!game.starfield) {
        game.starfield = [];
        for (let i = 0; i < 40; i++) {
          game.starfield.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 1.5,
            speed: 0.1 + Math.random() * 0.3,
            brightness: 0.3 + Math.random() * 0.7,
          });
        }
        for (let i = 0; i < 20; i++) {
          game.starfield.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 0.8,
            speed: 0.02 + Math.random() * 0.08,
            brightness: 0.2 + Math.random() * 0.4,
          });
        }
      }

      // Parallax scrolling stars
      for (const star of game.starfield) {
        star.y = (star.y + star.speed) % canvas.height;
        ctx.fillStyle = \`rgba(100, 150, 255, \${star.brightness})\`;
        ctx.globalAlpha = star.brightness;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }

      // Nebula clouds
      if (!game.nebulaClouds) {
        game.nebulaClouds = [
          { x: canvas.width * 0.2, y: canvas.height * 0.1, color: '#4400ff' },
          { x: canvas.width * 0.8, y: canvas.height * 0.3, color: '#ff0044' },
          { x: canvas.width * 0.5, y: canvas.height * 0.5, color: '#0044ff' },
        ];
      }

      for (const nebula of game.nebulaClouds) {
        const pulse = Math.sin(Date.now() * 0.0005) * 0.3 + 0.3;
        ctx.fillStyle = nebula.color;
        ctx.globalAlpha = pulse * 0.15;
        ctx.beginPath();
        ctx.arc(nebula.x, nebula.y, 120, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }

    function drawPlayer() {
      ctx.save();
      const shakeX = (Math.random() - 0.5) * game.screenShake;
      const shakeY = (Math.random() - 0.5) * game.screenShake;
      ctx.translate(player.x + shakeX, player.y + shakeY);

      // Shield
      if (player.shieldActive) {
        ctx.strokeStyle = 'rgba(0, 153, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0, 153, 255, 0.6)';
        ctx.shadowBlur = 20;
        const shieldTime = Date.now() * 0.005;
        for (let i = 0; i < 3; i++) {
          const radius = 35 + i * 8 + Math.sin(shieldTime + i) * 3;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.shadowColor = 'transparent';
      }

      // Engine exhaust glow
      ctx.shadowColor = 'rgba(255, 100, 0, 0.6)';
      ctx.shadowBlur = 20;
      ctx.fillStyle = 'rgba(255, 150, 0, 0.4)';
      const exhaustLen = 20 + Math.sin(Date.now() * 0.01) * 4;
      ctx.beginPath();
      ctx.ellipse(0, 20, 6, exhaustLen, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 16, 4, exhaustLen - 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ship main body (sleek)
      ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(-10, 8);
      ctx.lineTo(-4, 12);
      ctx.lineTo(4, 12);
      ctx.lineTo(10, 8);
      ctx.closePath();
      ctx.fill();

      // Cockpit glow
      ctx.fillStyle = '#ffff99';
      ctx.shadowColor = 'rgba(255, 255, 0, 0.8)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, -12, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Wings detail
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.lineTo(-14, -2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(10, -4);
      ctx.lineTo(14, -2);
      ctx.stroke();

      ctx.restore();
    }

    function drawBullets() {
      for (const bullet of bullets) {
        ctx.save();
        ctx.translate(bullet.x, bullet.y);

        const alpha = Math.min(1, bullet.life);
        ctx.globalAlpha = alpha;

        if (bullet.type === 'triple') {
          ctx.shadowColor = 'rgba(0, 200, 255, 0.8)';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#00ffff';
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#00ffff';
          ctx.fillRect(-2.5, -5, 5, 10);
        }

        // Trail
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillRect(-2.5, 8, 5, 10);
        ctx.globalAlpha = alpha * 0.2;
        ctx.fillRect(-2.5, 18, 5, 8);

        ctx.restore();
      }
    }

    function drawEnemies() {
      for (const enemy of enemies) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(enemy.rotation);

        const colors = ['#ff00ff', '#00ff00', '#ff8800', '#ffaa00'];
        const color = colors[enemy.type] || '#ff00ff';

        if (enemy.type === 'boss') {
          // Boss with rotating shield rings
          ctx.globalAlpha = 0.3 + enemy.pulsing * 0.3;
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 2;
          ctx.shadowColor = 'rgba(255, 255, 0, 0.6)';
          ctx.shadowBlur = 15;

          ctx.save();
          ctx.rotate(enemy.shieldRotation);
          for (let r = 1; r <= 3; r++) {
            ctx.beginPath();
            ctx.arc(0, 0, 15 + r * 10, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();

          ctx.globalAlpha = 1;

          // Boss core
          ctx.fillStyle = '#ffff00';
          ctx.shadowColor = 'rgba(255, 255, 0, 0.9)';
          ctx.shadowBlur = 20;
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = Math.cos(angle) * 20;
            const y = Math.sin(angle) * 20;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
          }

          // Inner hexagon
          ctx.fillStyle = '#ffff00';
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = Math.cos(angle) * 12;
            const y = Math.sin(angle) * 12;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();

          // Health bar
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.6;
          ctx.strokeRect(-28, -32, 56, 3);
          ctx.fillStyle = '#ffff00';
          ctx.fillRect(-28, -32, (enemy.health / enemy.maxHealth) * 56, 3);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
          ctx.globalAlpha = 0.5 + enemy.pulsing * 0.5;

          // Different enemy designs
          if (enemy.type === 0) {
            // Triangle with spikes
            ctx.beginPath();
            ctx.moveTo(0, -14);
            ctx.lineTo(-12, 12);
            ctx.lineTo(12, 12);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(-4, 0);
            ctx.lineTo(-8, 8);
            ctx.lineTo(-2, 6);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(4, 0);
            ctx.lineTo(8, 8);
            ctx.lineTo(2, 6);
            ctx.closePath();
            ctx.fill();
          } else if (enemy.type === 1) {
            // Diamond with glow rings
            ctx.beginPath();
            ctx.moveTo(0, -14);
            ctx.lineTo(14, 0);
            ctx.lineTo(0, 14);
            ctx.lineTo(-14, 0);
            ctx.closePath();
            ctx.fill();

            ctx.globalAlpha = 0.2 + enemy.pulsing * 0.2;
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.stroke();
          } else if (enemy.type === 2) {
            // Hexagon with inner pattern
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (i / 6) * Math.PI * 2;
              const x = Math.cos(angle) * 14;
              const y = Math.sin(angle) * 14;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();

            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();
          } else if (enemy.type === 3) {
            // Star shape
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
              const angle = (i / 10) * Math.PI * 2;
              const radius = i % 2 === 0 ? 14 : 8;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
          }

          ctx.globalAlpha = 1;
        }

        ctx.restore();
      }
    }

    function drawParticles() {
      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);

        if (p.isTrail) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    function drawPowerUps() {
      if (!game.powerUps) return;

      for (const pu of game.powerUps) {
        const alpha = pu.life / 8;
        ctx.save();
        ctx.translate(pu.x, pu.y);
        ctx.rotate(pu.rotation);
        ctx.globalAlpha = alpha;

        if (pu.type === 'triple') {
          ctx.shadowColor = 'rgba(0, 153, 255, 0.8)';
          ctx.shadowBlur = 15;
          ctx.fillStyle = '#0099ff';
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * 10;
            const y = Math.sin(angle) * 10;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.shadowColor = 'rgba(0, 255, 200, 0.8)';
          ctx.shadowBlur = 15;
          ctx.fillStyle = '#00ffc8';
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = alpha * 0.7;
          for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const x = Math.cos(angle) * 12;
            const y = Math.sin(angle) * 12;
            ctx.fillRect(x - 1, y - 1, 2, 2);
          }
        }

        ctx.restore();
      }
    }

    function drawAnnouncements() {
      for (const a of waveAnnouncements) {
        const alpha = Math.max(0, a.life / a.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ff00ff';
        ctx.shadowColor = 'rgba(255, 0, 255, 0.8)';
        ctx.shadowBlur = 25;
        ctx.font = \`bold \${a.scale * 80}px Arial\`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(\`WAVE \${a.waveNum}\`, canvas.width / 2, canvas.height / 2);
        ctx.restore();
      }
    }

    function drawScorePopups() {
      for (const sp of scorePopups) {
        const alpha = sp.life / sp.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = 'rgba(255, 255, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sp.text, sp.x, sp.y);
        ctx.restore();
      }
    }

    function drawHUD() {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Update HTML HUD
      livesEl.innerHTML = '♡'.repeat(Math.max(0, game.lives));
      scoreEl.textContent = 'SCORE ' + String(game.score).padStart(5, '0');
      waveEl.textContent = \`WAVE \${game.waveNum}\`;

      if (game.comboCount > 1) {
        comboEl.classList.add('active');
        comboEl.textContent = \`\${game.comboCount}x COMBO\`;
      } else {
        comboEl.classList.remove('active');
      }

      // Scanline effect
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.height; i += 2) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
    }

    function drawGameOver() {
      const elapsed = Math.floor((Date.now() - game.gameStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ff00ff';
      ctx.shadowColor = 'rgba(255, 0, 255, 0.9)';
      ctx.shadowBlur = 25;
      ctx.font = 'bold 64px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 80);

      ctx.fillStyle = '#00ffff';
      ctx.shadowColor = 'rgba(0, 255, 255, 0.6)';
      ctx.font = 'bold 28px Arial';
      ctx.fillText(\`SCORE: \${String(game.score).padStart(6, '0')}\`, canvas.width / 2, canvas.height / 2 - 10);

      ctx.font = '20px Arial';
      ctx.fillStyle = '#ffff00';
      ctx.shadowColor = 'rgba(255, 255, 0, 0.6)';
      ctx.fillText(\`MAX COMBO: \${game.maxCombo}x\`, canvas.width / 2, canvas.height / 2 + 30);
      ctx.fillText(\`TIME: \${minutes}:\${String(seconds).padStart(2, '0')}\`, canvas.width / 2, canvas.height / 2 + 60);

      ctx.fillStyle = '#00ff00';
      ctx.shadowColor = 'rgba(0, 255, 0, 0.6)';
      ctx.font = 'bold 18px Arial';
      ctx.fillText('TAP TO RESTART', canvas.width / 2, canvas.height / 2 + 120);
    }

    function render() {
      drawBackground();
      drawBullets();
      drawEnemies();
      drawParticles();
      drawPowerUps();
      drawPlayer();
      drawAnnouncements();
      drawScorePopups();
      drawHUD();

      if (game.gameOver) {
        drawGameOver();
      }
    }

    function gameLoop() {
      update();
      render();
      requestAnimationFrame(gameLoop);
    }

    function startGame() {
      game.score = 0;
      game.lives = 3;
      game.gameOver = false;
      game.waveStartTime = Date.now();
      game.waveNum = 1;
      game.elapsedTime = 0;
      game.killCount = 0;
      game.lastKillTime = 0;
      game.comboCount = 0;
      game.maxCombo = 0;
      game.powerUpActive = null;
      game.lastSpawnTime = null;
      game.lastBossTime = null;
      game.powerUps = [];
      game.screenShake = 0;
      game.gameStartTime = null;

      bullets.length = 0;
      enemies.length = 0;
      particles.length = 0;
      scorePopups.length = 0;
      waveAnnouncements.length = 0;

      player.x = canvas.width / 2;
      player.y = canvas.height * 0.85;
      player.lastFireTime = 0;
      player.shieldActive = false;

      createWaveAnnouncement(1);
      gameLoop();
    }

    canvas.addEventListener('click', () => {
      if (game.gameOver) {
        startGame();
      }
    });

    canvas.addEventListener('touchend', (e) => {
      if (game.gameOver && !input.touchActive) {
        startGame();
      }
    });

    startGame();
  </script>
</body>
</html>`;
