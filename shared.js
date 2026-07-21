/* shared.js -- loaded on every page (index + faq + join-the-team + book-a-call + privacy-policy +
   terms-of-service). One background canvas, one back-to-top button, one implementation, instead
   of each page carrying its own copy-pasted version of both. No GSAP/Lenis dependency -- pages
   that don't load main.js (everything except index.html) get this for free with zero extra
   library weight. `lenis` stays undefined here; main.js (homepage only) assigns it when it
   creates the real Lenis instance, and to-top below already checks before using it. */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let lenis;

/* kinetic-type loading veil -- one shared implementation (was a plain fade+logo, copy-pasted
   per subpage, homepage had none at all). Letters start scattered (random offset/rotation/blur
   per span, set inline via --kx/--ky/--kr in the HTML) and spring into place staggered by
   nth-child transition-delay in CSS -- kinetic-type reference, adapted to the site's own Nohemi
   wordmark instead of a serif/photo treatment (no photography on this site, see brief). Markup
   is visible by default (CSS, not JS) so there's no flash-of-unstyled-page if this script is
   slow to run; JS only ever animates it in, then out. Capped under ~1.6s total and
   click-to-skip -- the previous loader's whole problem was reading like dead time. */
(function(){
  const veil=document.getElementById('ktVeil');
  if(!veil){document.dispatchEvent(new Event('mvs:veilDone'));return;}
  if(reduce){veil.remove();document.dispatchEvent(new Event('mvs:veilDone'));return;}
  requestAnimationFrame(()=>veil.classList.add('kt-in'));
  let done=false;
  function finish(){
    if(done)return;done=true;
    veil.removeEventListener('click',finish);
    veil.classList.add('kt-out');
    document.dispatchEvent(new Event('mvs:veilDone'));
    setTimeout(()=>veil.remove(),520);
  }
  veil.addEventListener('click',finish);
  setTimeout(finish,1100);
})();

/* one global background -- drifting, twinkling sparkle field on a single fixed canvas behind the
   whole page. DPR-capped, 30fps (halved -- motion's slow enough half the frames are invisible),
   pauses when the tab is hidden. Accent-coloured dots on by default; pages that want a strictly
   monochrome field (e.g. join-the-team) set data-bg-mono on <body> to disable them. */
(function(){
  const cv=document.getElementById('bgfx');
  if(!cv||reduce)return;
  const mono=document.body.hasAttribute('data-bg-mono');
  const ctx=cv.getContext('2d');
  /* narrow (phone) screens get a lower DPR cap and roughly a third the particle count -- this
     canvas repaints every OTHER rAF already (the hr flip below), but on a phone GPU/CPU that's
     still real per-frame cost competing with the browser's own touch-scroll compositing, which is
     exactly the kind of thing that reads as "choppy/laggy/jittery" scrolling even though nothing
     here is technically broken. Reported after the redesign shipped -- this canvas is the one
     thing running continuously on every single page, unlike everything else which is gated to
     desktop or paused off-screen. */
  const narrow=window.innerWidth<700;
  const dpr=Math.min(window.devicePixelRatio||1,narrow?1:1.25);
  let w=0,h=0,pts=[];
  function resize(){
    w=window.innerWidth;h=window.innerHeight;
    cv.width=w*dpr;cv.height=h*dpr;cv.style.width=w+'px';cv.style.height=h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const n=Math.round(w*h/(narrow?22000:8000));
    pts=Array.from({length:n},()=>({
      x:Math.random()*w,y:Math.random()*h,
      r:Math.random()*1.3+0.3,
      vx:(Math.random()-0.5)*0.12,vy:(Math.random()-0.5)*0.12,
      tw:Math.random()*Math.PI*2,ts:0.6+Math.random()*1.4,
      amber:!mono&&Math.random()<0.14
    }));
  }
  window.addEventListener('resize',resize,{passive:true});
  resize();
  /* pointer repel -- tsParticles "hover: repulse" equivalent, done as a per-frame draw-position
     offset only (base drift x/y never mutated) so a lingering cursor can't accumulate velocity
     and fling particles off; cheap squared-distance check skips the sqrt for anything outside
     the radius, which is nearly every particle nearly every frame. */
  let mx=null,my=null;
  window.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;},{passive:true});
  document.addEventListener('mouseleave',()=>{mx=null;my=null;});
  const REPEL_R=110,REPEL_F=18;
  /* on phones, the exact moment a scroll gesture starts is when the browser's compositor most
     needs the main thread free -- this canvas draws unconditionally regardless of scroll state,
     competing right at that handoff (reported as "grab the screen and it hitches"). Skipping the
     draw entirely while a touch-scroll is active (narrow viewports only; desktop untouched) frees
     the main thread for exactly the window that matters, resuming ~150ms after scroll settles. */
  let scrolling=false,scrollT=null;
  if(narrow)window.addEventListener('scroll',()=>{
    scrolling=true;clearTimeout(scrollT);scrollT=setTimeout(()=>{scrolling=false;},150);
  },{passive:true});
  let running=true,t=0,hr=false;
  function frame(){
    if(!running)return;
    if(scrolling){requestAnimationFrame(frame);return;}
    hr=!hr;if(!hr){requestAnimationFrame(frame);return;}
    t+=0.032;
    ctx.clearRect(0,0,w,h);
    for(const p of pts){
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x+=w;else if(p.x>w)p.x-=w;
      if(p.y<0)p.y+=h;else if(p.y>h)p.y-=h;
      let dx=0,dy=0;
      if(mx!==null){
        const ddx=p.x-mx,ddy=p.y-my,d2=ddx*ddx+ddy*ddy;
        if(d2<REPEL_R*REPEL_R&&d2>0.01){
          const d=Math.sqrt(d2),f=(1-d/REPEL_R)*REPEL_F;
          dx=(ddx/d)*f;dy=(ddy/d)*f;
        }
      }
      const a=(Math.sin(t*p.ts+p.tw)*0.5+0.5)*0.7+0.12;
      ctx.beginPath();
      ctx.arc(p.x+dx,p.y+dy,p.r,0,6.283);
      ctx.fillStyle=p.amber?`rgba(0,238,255,${a})`:`rgba(10,10,10,${a})`;
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange',()=>{running=!document.hidden;if(running)requestAnimationFrame(frame);});
})();

/* generic scroll-reveal for pages without GSAP (faq/join-the-team) -- tag any element .reveal,
   this adds .in the first time it's ~12% into view. Harmless no-op on pages with none. */
(function(){
  if(reduce)return;
  const els=document.querySelectorAll('.reveal');
  if(!els.length||!('IntersectionObserver' in window))return;
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
  },{threshold:0.12,rootMargin:'0px 0px -60px 0px'});
  els.forEach(el=>io.observe(el));
})();

/* back-to-top button -- show past one viewport, click scrolls to top (Lenis-aware where present) */
(function(){
  const btn=document.getElementById('toTop');
  if(!btn)return;
  let pending=false;
  const check=()=>{btn.classList.toggle('show',window.scrollY>window.innerHeight*0.8);};
  window.addEventListener('scroll',()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;check();});},{passive:true});
  btn.addEventListener('click',()=>{lenis?lenis.scrollTo(0,{duration:1.1}):window.scrollTo({top:0,behavior:'smooth'});});
  check();
})();

/* scroll progress bar -- thin fixed line across the top, fills as the page scrolls. Injected
   here (not per-page HTML) so every page gets it from one edit. Brand blue, matches the
   text-selection colour and the cal.com embed accent -- one consistent blue across the site. */
(function(){
  const bar=document.createElement('div');
  bar.id='scrollBar';
  bar.style.cssText='position:fixed;top:0;left:0;height:3px;width:100%;transform:scaleX(0);transform-origin:left;background:#00eeff;z-index:999;pointer-events:none;';
  if(!reduce)bar.style.transition='transform 100ms linear';
  document.documentElement.appendChild(bar);
  let pending=false;
  function update(){
    const h=document.documentElement.scrollHeight-window.innerHeight;
    bar.style.transform='scaleX('+(h>0?Math.min(window.scrollY/h,1):0)+')';
  }
  window.addEventListener('scroll',()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;update();});},{passive:true});
  window.addEventListener('resize',update,{passive:true});
  update();
})();

/* tab-blur title swap -- when the visitor tabs away, the title changes to a little nudge, then
   reverts on return. Purely a personality touch, no functional purpose. */
(function(){
  const original=document.title;
  const away="Come back? 👋";
  document.addEventListener('visibilitychange',()=>{
    document.title=document.hidden?away:original;
  });
})();

/* click-to-copy on mailto/tel links -- copies the address/number to clipboard alongside the
   normal mailto/tel action (doesn't prevent default, so the mail/phone app still opens). Small
   toast confirms the copy for anyone who just wants the address, not a mail client popup. */
(function(){
  if(!navigator.clipboard)return;
  let toastEl=null,toastT=null;
  function toast(msg){
    if(!toastEl){
      toastEl=document.createElement('div');
      toastEl.style.cssText='position:fixed;left:50%;bottom:28px;transform:translate(-50%,12px);'
        +'background:#0a0a0a;color:#fff;font:600 13px/1 -apple-system,sans-serif;padding:11px 18px;'
        +'border-radius:999px;z-index:1000;opacity:0;transition:opacity 200ms ease,transform 200ms ease;'
        +'pointer-events:none;box-shadow:0 8px 24px -6px rgba(0,0,0,.4);';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent=msg;
    clearTimeout(toastT);
    requestAnimationFrame(()=>{toastEl.style.opacity='1';toastEl.style.transform='translate(-50%,0)';});
    toastT=setTimeout(()=>{toastEl.style.opacity='0';toastEl.style.transform='translate(-50%,12px)';},1600);
  }
  document.addEventListener('click',function(e){
    const a=e.target.closest('a[href^="mailto:"],a[href^="tel:"]');
    if(!a)return;
    const href=a.getAttribute('href');
    const isMail=href.indexOf('mailto:')===0;
    const value=decodeURIComponent(href.slice(isMail?7:4).split('?')[0]);
    navigator.clipboard.writeText(value).then(()=>toast((isMail?'Email':'Number')+' copied — '+value)).catch(()=>{});
  });
})();

/* page-fade transition -- fades content out on internal link click, then navigates natively.
   Fade-in on arrival is pure CSS (body{animation:pageFadeIn...} on every page) so it can never
   get stuck invisible even if this script fails to run -- worst case on failure is just a normal
   instant navigation, same as before this existed. Not a full SPA/content-swap (brief ruled that
   out -- too much lift for 6 independent static pages, no router). */
(function(){
  if(reduce)return;
  document.addEventListener('click',function(e){
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    const a=e.target.closest('a[href]');
    if(!a)return;
    const href=a.getAttribute('href');
    if(!href||href.charAt(0)==='#'||href.indexOf('mailto:')===0||href.indexOf('tel:')===0)return;
    if(a.target&&a.target!==''&&a.target!=='_self')return;
    let url;
    try{url=new URL(href,location.href);}catch(_){return;}
    if(url.origin!==location.origin)return;
    if(url.pathname===location.pathname&&url.hash)return; // same-page anchor jump, no fade
    e.preventDefault();
    document.body.style.transition='opacity var(--dur-normal,300ms) var(--ease-default,ease)';
    document.body.style.opacity='0';
    setTimeout(function(){location.href=href;},300);
  },true);
})();
