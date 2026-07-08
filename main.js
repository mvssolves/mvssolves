gsap.registerPlugin(ScrollTrigger);
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isDesktop = window.matchMedia('(min-width:901px)').matches;

/* one shared IntersectionObserver (threshold:0) for the handful of independent single-element
   visibility toggles below (ElectricBorder in-view, hero-off, prem spin-off, carousel spin-off) —
   was 4 separate observer instances doing the same threshold:0 visibility-flag pattern. */
const _visibilityObserver=new IntersectionObserver(es=>{
  es.forEach(e=>{const cb=e.target.__onVisible;if(cb)cb(e.isIntersecting);});
},{threshold:0});
function onVisibilityChange(el,cb){el.__onVisible=cb;_visibilityObserver.observe(el);}
/* the desktop-only pin/scrub effects and the Premium co-tag observer are all set up once, keyed off
   this snapshot — reload on a breakpoint crossing rather than trying to hot-swap live ScrollTriggers
   and pin-spacers (resizing a window or rotating a tablet across 901px mid-session is rare, a reload
   is the safe way to guarantee the new viewport gets the correct desktop/mobile behavior) */
window.matchMedia('(min-width:901px)').addEventListener('change', () => location.reload());

/* Lenis + GSAP ticker (scroll/58 sync pattern), desktop only. On mobile Safari, Lenis's virtual
   scroll desyncs when the address bar collapses/expands mid-scroll (its resize handler recalcs
   dimensions off a viewport that's still animating) — the page appears to stall until the user
   scrolls again to force a resync. Known Lenis-on-iOS issue, not fixable by tuning options; native
   scroll (the reduce-motion fallback path below) has no such desync since there's no virtual state
   to get out of sync. */
let lenis;
if(!reduce)gsap.ticker.lagSmoothing(0);
if(!reduce&&isDesktop){
  lenis=new Lenis({duration:1.2,syncTouch:false});
  gsap.ticker.add(t=>lenis.raf(t*1000));
  lenis.on('scroll',ScrollTrigger.update);
}

/* mobile nav toggle */
(function(){
  const btn=document.getElementById('navToggle'),links=document.getElementById('navLinks');
  if(!btn||!links)return;
  btn.addEventListener('click',()=>{
    const open=links.classList.toggle('open');
    btn.setAttribute('aria-expanded',open);
  });
  links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    links.classList.remove('open');btn.setAttribute('aria-expanded','false');
  }));
})();

/* scroll progress + nav */
const prog=document.getElementById('progress'),nav=document.getElementById('nav');
const scPct=document.getElementById('scPct');
/* document height cached instead of read every scroll tick — recomputed on resize only */
let scrollableH=document.documentElement.scrollHeight-window.innerHeight;
window.addEventListener('resize',()=>{scrollableH=document.documentElement.scrollHeight-window.innerHeight;},{passive:true});
function onScroll(y){nav.classList.toggle('scrolled',y>40);
  const pct=scrollableH>0?(y/scrollableH*100):0;
  prog.style.width=pct+'%';
  if(scPct)scPct.textContent=Math.round(pct)+'%';}
if(lenis) lenis.on('scroll',({scroll})=>onScroll(scroll));
else{
  /* no-Lenis path (mobile or reduced-motion): rAF-coalesce so a burst of native scroll events
     collapses to one class-toggle/style write per frame instead of running raw per event. */
  let scrollPending=false;
  window.addEventListener('scroll',()=>{
    if(scrollPending)return;
    scrollPending=true;
    requestAnimationFrame(()=>{scrollPending=false;onScroll(window.scrollY);});
  },{passive:true});
}

/* hero intro */
function playHeroReveal(){
  document.dispatchEvent(new Event('mvs:reveal'));
  if(reduce)return;
  const fadeIn=(el,delay)=>{if(!el)return;gsap.fromTo(el,{opacity:0,y:14},{opacity:1,y:0,duration:0.6,delay,ease:'power2.out'});};
  fadeIn(document.querySelector('.navcta'),0);
  document.querySelectorAll('h1 .line>span').forEach((span,i)=>fadeIn(span,i*0.1));
  fadeIn(document.getElementById('hsub'),0.45);
  document.querySelectorAll('#hcta .btn').forEach((btn,i)=>fadeIn(btn,0.7+i*0.1));
}


/* section heading reveals. once:true on every scrollTrigger below — without it, GSAP's default
   toggleActions ('play none none reverse') un-plays each reveal (fades back to its "from" state)
   the moment you scroll back up past its start point, then replays it scrolling back down. With
   this many reveals stacked down the page, any bit of scroll wobble (trackpad, momentum overshoot)
   made half the page flicker in/out — that's the "flickering" complaint. once:true plays each
   reveal exactly once and leaves it in its end state for good. */
if(!reduce){
  gsap.utils.toArray('.section h2:not(.h2-split)').forEach(el=>{
    gsap.from(el,{y:32,opacity:0,duration:1.05,ease:'power4.out',
      scrollTrigger:{trigger:el,start:'top 86%',once:true,fastScrollEnd:true}});
  });
  /* sections 01-03 only: per-word mask reveal instead of the flat fade above */
  gsap.utils.toArray('.h2-split').forEach(h=>{
    const words=h.querySelectorAll('.word>span');
    gsap.fromTo(words,{yPercent:110,opacity:0},{yPercent:0,opacity:1,duration:0.7,stagger:0.05,
      ease:'power3.out',scrollTrigger:{trigger:h,start:'top 86%',once:true,fastScrollEnd:true}});
  });
  gsap.utils.toArray('.section .sub, .lab').forEach(el=>{
    gsap.from(el,{y:30,opacity:0,duration:0.9,ease:'power3.out',
      scrollTrigger:{trigger:el,start:'top 88%',once:true,fastScrollEnd:true}});
  });
  /* eyebrow labels — matrix-style scramble-to-real-text decode, seen in the reference video.
     Layers on top of the fade above; .lab is already monospace so glyph-width stays stable. */
  (function(){
    const SCRAMBLE='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    function scrambleReveal(el){
      const final=el.textContent,total=18;let frame=0;
      const iv=setInterval(()=>{
        frame++;
        el.textContent=final.split('').map((c,i)=>{
          if(c===' ')return c;
          const revealAt=Math.floor((i/final.length)*total)+4;
          return frame>=revealAt?c:SCRAMBLE[Math.floor(Math.random()*SCRAMBLE.length)];
        }).join('');
        if(frame>=total+4){el.textContent=final;clearInterval(iv);}
      },35);
    }
    gsap.utils.toArray('.lab').forEach(el=>{
      ScrollTrigger.create({trigger:el,start:'top 90%',once:true,onEnter:()=>scrambleReveal(el)});
    });
  })();
  /* batched reveal for body groups so they don't pop in flat under animated headings.
     fastScrollEnd here too — batch()'s onEnter fires just like any other ScrollTrigger, so a fast
     scroll past a whole card grid queued the same flash. */
  ['.tiers .tier','.steps .step'].forEach(sel=>{
    ScrollTrigger.batch(gsap.utils.toArray(sel),{start:'top 90%',fastScrollEnd:true,
      onEnter:b=>gsap.fromTo(b,{opacity:0},{opacity:1,duration:0.6,stagger:0.06,ease:'power2.out',overwrite:true})});
  });
  /* capabilities (01) — plain opacity+y fade, no z/rotateX. The 3D version forced a compositing
     layer per card right as Lenis hands off from the hero, which read as scroll lag. */
  ScrollTrigger.batch(gsap.utils.toArray('#capabilities .cap-grid .cap'),{start:'top 94%',fastScrollEnd:true,
    onEnter:b=>gsap.fromTo(b,{opacity:0,y:22},
      {opacity:1,y:0,duration:0.7,stagger:0.06,ease:'power2.out',overwrite:true})});
  /* integrations (02) carousel — whole assembly scales/fades in once, spin keeps going after.
     Softer scale range + longer duration, same reasoning as above */
  gsap.fromTo('.int-carousel-wrap',{opacity:0,scale:0.94,y:20},
    {opacity:1,scale:1,y:0,duration:1.2,ease:'power2.out',scrollTrigger:{trigger:'.int-carousel-wrap',start:'top 88%',once:true,fastScrollEnd:true}});
  /* hidden-cost (03) wheel — pops in from Z-depth to match the extrude-on-hover language */
  gsap.fromTo('.wheel-disc',{opacity:0,z:-220},
    {opacity:1,z:0,duration:0.9,ease:'power3.out',scrollTrigger:{trigger:'.wheel-disc',start:'top 88%',once:true,fastScrollEnd:true}});
  /* ring draws itself in, same beat as the disc pop — reference video's circle-trace */
  gsap.fromTo('.wheel-ring circle',{strokeDashoffset:309.9},
    {strokeDashoffset:0,duration:1.3,ease:'power2.inOut',scrollTrigger:{trigger:'.wheel-disc',start:'top 88%',once:true,fastScrollEnd:true}});
  /* labels pop in one at a time as the ring finishes drawing around them — video sequences the
     chips onto the ring rather than showing them all at once */
  gsap.fromTo('.wn',{opacity:0,scale:0.6},{opacity:1,scale:1,duration:0.5,stagger:0.15,delay:0.5,
    ease:'back.out(2)',scrollTrigger:{trigger:'.wheel-disc',start:'top 88%',once:true,fastScrollEnd:true}});
  /* hero content drifts up on scroll — desktop only. scrub:true recalculates every scroll tick,
     right at the hero->01 handoff — the exact spot users felt lag on mobile. */
  if(isDesktop){
    gsap.to('.h-wrap',{yPercent:-8,ease:'none',scrollTrigger:{trigger:'#top',start:'top top',end:'bottom top',scrub:true}});
  }
}

/* pause hero sheen when scrolled past — kills off-screen repaint cost */
(function(){const hero=document.getElementById('top');if(!hero)return;
  onVisibilityChange(hero,visible=>document.documentElement.classList.toggle('hero-off',!visible));})();
/* pause the Premium card's spinning gradient border off-screen — was running unconditionally forever */
(function(){const prem=document.querySelector('.tier.prem');if(!prem)return;
  onVisibilityChange(prem,visible=>prem.classList.toggle('spin-off',!visible));})();
/* pause the integrations carousel spin off-screen — same reasoning, was running forever */
(function(){const ic=document.querySelector('.int-carousel');if(!ic)return;
  onVisibilityChange(ic,visible=>ic.classList.toggle('spin-off',!visible));})();
/* same pause for the mobile 2D marquee replacement */
(function(){const mq=document.querySelector('.int-marquee');if(!mq)return;
  onVisibilityChange(mq,visible=>mq.classList.toggle('spin-off',!visible));})();

/* floating book-call pill: visible once past the hero, hidden again once the book section
   (which has its own CTA already on screen) is reached. Own observer — not the shared one,
   since #top already has a callback registered above and onVisibilityChange only keeps one
   per element. */
(function(){
  const fc=document.getElementById('floatCta'),hero=document.getElementById('top'),book=document.getElementById('book');
  if(!fc||!hero)return;
  let heroVisible=true,bookVisible=false;
  function sync(){fc.classList.toggle('show',!heroVisible&&!bookVisible);}
  new IntersectionObserver(es=>es.forEach(e=>{heroVisible=e.isIntersecting;sync();}),{threshold:0}).observe(hero);
  if(book)new IntersectionObserver(es=>es.forEach(e=>{bookVisible=e.isIntersecting;sync();}),{threshold:0}).observe(book);
})();

/* Premium feature callouts — fade in once, desktop only */
if(isDesktop&&!reduce){
  const prem=document.querySelector('.tier.prem');
  const tags=prem?prem.querySelectorAll('.co-tag'):[];
  if(tags.length){
    new IntersectionObserver((es,ob)=>{es.forEach(en=>{if(en.isIntersecting){
      gsap.to(tags,{opacity:1,duration:0.5,stagger:0.15,ease:'power1.out'});ob.disconnect();
    }});},{threshold:0.4}).observe(prem);
  }
}

/* top-edge fade — was 4 stacked backdrop-filter:blur() layers (GradualBlur port), expensive to
   keep resampling every frame. A plain gradient-to-background div gives the same "content softens
   under the nav" read for effectively zero per-frame cost (just alpha blending). */
if(!reduce){
  const fade=document.createElement('div');
  fade.className='gblur top';
  fade.style.height='84px';
  document.body.appendChild(fade);
}

/* BorderGlow (React Bits port → vanilla, no deps) on capability grid cards */
if(window.matchMedia('(pointer:fine)').matches){
  document.querySelectorAll('.border-glow-card').forEach(card=>{
    let pending=false,lastEvent=null;
    card.addEventListener('pointermove',e=>{
      lastEvent=e;
      if(pending)return;
      pending=true;
      requestAnimationFrame(()=>{
        pending=false;
        const rc=card.getBoundingClientRect();
        const x=lastEvent.clientX-rc.left,y=lastEvent.clientY-rc.top;
        const cx=rc.width/2,cy=rc.height/2;
        const dx=x-cx,dy=y-cy;
        let kx=Infinity,ky=Infinity;
        if(dx!==0)kx=cx/Math.abs(dx);
        if(dy!==0)ky=cy/Math.abs(dy);
        const edge=Math.min(Math.max(1/Math.min(kx,ky),0),1);
        let angle=0;
        if(dx!==0||dy!==0){angle=Math.atan2(dy,dx)*(180/Math.PI)+90;if(angle<0)angle+=360;}
        card.style.setProperty('--edge-proximity',(edge*100).toFixed(3));
        card.style.setProperty('--cursor-angle',angle.toFixed(3)+'deg');
      });
    });
  });
}

/* hidden-cost wheel: click a quadrant, swap the center panel copy */
(function(){
  const wheel=document.querySelector('.wheel-disc');if(!wheel)return;
  const stage=wheel.closest('.wheel-stage');
  const segs=wheel.querySelectorAll('.wseg');
  const labels=stage.querySelectorAll('.wn');
  const lab=wheel.querySelector('.wc-lab'),desc=wheel.querySelector('.wc-desc');
  segs.forEach((seg,i)=>seg.addEventListener('click',()=>{
    segs.forEach(s=>s.classList.toggle('active',s===seg));
    labels.forEach((l,li)=>l.classList.toggle('wn-active',li===i));
    lab.textContent=seg.dataset.lab;
    desc.textContent=seg.dataset.desc;
  }));
  /* subtle mouse-follow tilt, desktop pointer only — same proximity math already used for .border-glow-card */
  if(window.matchMedia('(pointer:fine)').matches){
    const wrap=wheel.closest('.wheel-wrap');
    wrap.addEventListener('pointermove',e=>{
      const rc=wheel.getBoundingClientRect();
      const px=(e.clientX-rc.left)/rc.width-0.5,py=(e.clientY-rc.top)/rc.height-0.5;
      wheel.style.transform=`rotateX(${(10-py*14).toFixed(2)}deg) rotateY(${(-6+px*14).toFixed(2)}deg)`;
    });
    wrap.addEventListener('pointerleave',()=>{wheel.style.transform='';});
  }
})();

/* pricing mode toggle: Monthly / Own outright */
(function(){
  const mt=document.getElementById('modeToggle');if(!mt)return;
  const tiers=document.getElementById('tiers');
  mt.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    const mode=b.dataset.mode;
    mt.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    tiers.classList.toggle('mode-own',mode==='own');
    tiers.classList.toggle('mode-usd',mode==='usd');
    tiers.classList.toggle('mode-usd-own',mode==='usd-own');
    if(!reduce){
      const sel=mode==='own'?'.po':mode==='usd'?'.pu':mode==='usd-own'?'.puo':'.pm';
      const prices=tiers.querySelectorAll(sel+' .price');
      gsap.fromTo(prices,{opacity:0,y:-6},{opacity:1,y:0,duration:0.3,stagger:0.04,ease:'power2.out',overwrite:true});
    }
    ScrollTrigger.refresh();
  });
})();

/* in-page anchor jumps — smooth scroll, no wipe overlay */
document.querySelectorAll('a[href^="#"]').forEach(link=>{
  link.addEventListener('click',e=>{
    const t=link.getAttribute('href');
    if(t==='#'||!document.querySelector(t))return;
    if(t==='#top'&&window.scrollY<10)return;
    e.preventDefault();
    const el=document.querySelector(t);
    if(reduce){el.scrollIntoView();return;}
    if(lenis){lenis.scrollTo(el);}else{el.scrollIntoView({behavior:'smooth'});}
  });
});

/* Cal.com discovery embed (live booking) */
(function(C,A,L){let p=function(a,ar){a.q.push(ar);};let d=C.document;C.Cal=C.Cal||function(){let cal=C.Cal;let ar=arguments;if(!cal.loaded){cal.ns={};cal.q=cal.q||[];d.head.appendChild(d.createElement("script")).src=A;cal.loaded=true;}if(ar[0]===L){const api=function(){p(api,arguments);};const namespace=ar[1];api.q=api.q||[];if(typeof namespace==="string"){cal.ns[namespace]=cal.ns[namespace]||api;p(cal.ns[namespace],ar);p(cal,["initNamespace",namespace]);}else p(cal,ar);return;}p(cal,ar);};})(window,"https://app.cal.com/embed/embed.js","init");
function initCal(){
  try{
    Cal("init","discovery",{origin:"https://app.cal.com"});
    Cal.ns.discovery("inline",{elementOrSelector:"#cal-embed",calLink:"bjorn-van-staden-zxcmiq/discovery",layout:"month_view"});
    Cal.ns.discovery("ui",{hideEventTypeDetails:false,layout:"month_view"});
  }catch(err){document.getElementById('cal-embed').innerHTML='<div style="padding:40px;font-family:JetBrains Mono,monospace;font-size:13px;color:#6a6a72">Booking calendar — <a href="https://cal.com/bjorn-van-staden-zxcmiq/discovery" style="color:#0a0a0a;text-decoration:underline">open in new tab →</a></div>';}
}
/* lazy-load the Cal.com booking app only when the visitor nears it — major initial-load win */
(function(){const sec=document.getElementById('book');if(!sec)return;let done=false;
  new IntersectionObserver((es,ob)=>{es.forEach(en=>{if(en.isIntersecting&&!done){done=true;initCal();ob.disconnect();}});},{rootMargin:'500px'}).observe(sec);})();

window.addEventListener('load',()=>{
  scrollableH=document.documentElement.scrollHeight-window.innerHeight;
  (window.requestIdleCallback||function(cb){setTimeout(cb,400);})(()=>ScrollTrigger.refresh());
});
/* web fonts (Nohemi/Cormorant/JetBrains Mono/General Sans) swap in async — on slower mobile
   connections that can land AFTER the 'load' refresh above, reflowing text and shifting every
   'top X%' trigger point calculated against the pre-swap layout. Symptom: reveals silently skip
   straight to their end state on mobile because ScrollTrigger thinks it's already past them. */
if(document.fonts&&document.fonts.ready){
  document.fonts.ready.then(()=>ScrollTrigger.refresh());
}
/* mobile Safari fires 'resize' (height-only) as the address bar collapses/expands mid-scroll.
   ScrollTrigger.refresh() forces a layout pass across every trigger on the page — real cost,
   and running it mid-scroll is what read as the page stalling/locking until scrolled again.
   The address-bar case only ever changes height, never width (and 'top 88%'-style triggers
   drift by at most the bar's ~50-100px there — imperceptible). Only refresh on a real width
   change (resize/orientation change), where triggers can actually shift meaningfully. */
(function(){
  let t,lastW=window.innerWidth;
  window.addEventListener('resize',()=>{
    if(window.innerWidth===lastW)return;
    lastW=window.innerWidth;
    clearTimeout(t);
    t=setTimeout(()=>ScrollTrigger.refresh(),200);
  },{passive:true});
})();

/* intro veil — typewriter reveal, one word at a time, then a curtain-lift into the hero. Plays once per page load. */
(function(){
  const veil=document.getElementById('introVeil'),type=document.getElementById('introType');
  const el=document.getElementById('introLine');
  if(!veil||reduce){playHeroReveal();return;}
  document.documentElement.classList.add('no-scroll');
  if(lenis)lenis.stop();
  const words=['Built.','To.','Convert.'];
  const CHAR_MS=55,HOLD_MS=380,CLEAR_MS=120;
  let t=250;
  words.forEach((word,i)=>{
    for(let c=1;c<=word.length;c++){
      setTimeout(()=>{el.innerHTML=word.slice(0,c)+'<span class="intro-caret"></span>';},t);
      t+=CHAR_MS;
    }
    setTimeout(()=>{el.textContent=word;},t);
    t+=HOLD_MS;
    if(i<words.length-1){
      setTimeout(()=>{el.textContent='';},t);
      t+=CLEAR_MS;
    }
  });
  t+=450;
  setTimeout(()=>{
    type.classList.add('exit');
    setTimeout(()=>{
      veil.classList.add('curtain');
      document.documentElement.classList.remove('no-scroll');
      if(lenis)lenis.start();
      playHeroReveal();
      setTimeout(()=>{veil.remove();type.remove();},700);
    },250);
  },t);
})();
