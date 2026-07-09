gsap.registerPlugin(ScrollTrigger);
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isDesktop = window.matchMedia('(min-width:901px)').matches;

/* one shared IntersectionObserver (threshold:0) for the handful of independent single-element
   visibility toggles below (ElectricBorder in-view, hero-off, prem spin-off, carousel spin-off) —
   was 4 separate observer instances doing the same threshold:0 visibility-flag pattern. */
const _visibilityObserver=new IntersectionObserver(es=>{
  es.forEach(e=>{(e.target.__onVisible||[]).forEach(cb=>cb(e.isIntersecting));});
},{threshold:0});
function onVisibilityChange(el,cb){(el.__onVisible=el.__onVisible||[]).push(cb);_visibilityObserver.observe(el);}
/* mobile browser chrome (address bar) collapsing/expanding on scroll fires resize events that
   only ever change height, never width — the 3D scenes below were recomputing full renderer
   size + camera matrices on every one of those, which is what read as a frame hop tied to
   scroll. Same guard already used for ScrollTrigger.refresh further down: only act on a real
   width change. */
function onWidthResize(cb){
  let lastW=window.innerWidth;
  window.addEventListener('resize',()=>{
    if(window.innerWidth===lastW)return;
    lastW=window.innerWidth;
    cb();
  },{passive:true});
}
/* shared scroll-ripple impulse — every 3D scene reads this one number instead of running its
   own scroll-velocity tracking. Spikes on scroll delta, decays every real frame via gsap.ticker
   (already running site-wide for Lenis sync) so scenes never need their own decay loop. */
let scrollImpulse=0,_lastImpulseY=window.scrollY;
window.addEventListener('scroll',()=>{
  const y=window.scrollY;
  scrollImpulse=Math.min(1,scrollImpulse+Math.abs(y-_lastImpulseY)*0.025);
  _lastImpulseY=y;
},{passive:true});
gsap.ticker.add(()=>{scrollImpulse*=0.92;});

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
/* document height cached instead of read every scroll tick. Recomputed on resize AND via
   ResizeObserver on <body> (debounced) — catches every height-changing cause (details expanding,
   Cal embed lazy-load, fonts, whatever) instead of drifting stale like the window-resize-only
   version did, which is why the tracker read wrong once page content grew after initial paint. */
let scrollableH=document.documentElement.scrollHeight-window.innerHeight;
function recalcScrollable(){scrollableH=document.documentElement.scrollHeight-window.innerHeight;}
window.addEventListener('resize',recalcScrollable,{passive:true});
(function(){
  let roT=null;
  new ResizeObserver(()=>{clearTimeout(roT);roT=setTimeout(recalcScrollable,120);}).observe(document.body);
})();
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

/* book/closing 3D — single large rotating faceted polyhedron, slow pulse. Fourth distinct
   visual language (network / grid / orbit / solid) — deliberately the quietest and simplest,
   matching "no pitch, just a plan" copy. One mesh, one draw call, trivial per-frame cost. */
function initBookPoly3D(canvas){
  if(!canvas||reduce||typeof THREE==='undefined')return;
  let gl;
  try{gl=canvas.getContext('webgl2')||canvas.getContext('webgl');}catch(e){}
  if(!gl)return;

  const section=canvas.closest('#book');
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,1,0.1,50);
  camera.position.set(0,0,7);

  const WHITE=new THREE.Color(0xffffff),GREY=new THREE.Color(0x9a9aa2),col=new THREE.Color();
  const mat=new THREE.MeshBasicMaterial({wireframe:true,transparent:true,opacity:0.26});
  const poly=new THREE.Mesh(new THREE.IcosahedronGeometry(1.8,1),mat);
  scene.add(poly);
  const coreMat=new THREE.MeshBasicMaterial({transparent:true,opacity:0.5,blending:THREE.AdditiveBlending,depthWrite:false});
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(0.32,0),coreMat);
  scene.add(core);

  /* mobile: narrow viewport gets a much narrower horizontal FOV at the same world distance, so
     a fixed x-offset that reads as "off to the side" on desktop reads as "half cropped off-screen,
     way too big" on mobile. Push the camera back and pull the shape toward center proportionally. */
  let w=0,h=0;
  function size(){
    const r=section.getBoundingClientRect();
    w=r.width;h=r.height;
    renderer.setSize(w,h,false);
    camera.aspect=w/Math.max(h,1);
    camera.updateProjectionMatrix();
    const narrow=w<700;
    camera.position.z=narrow?10:7;
    const pos=new THREE.Vector3(narrow?1.6:4.2,0,-1);
    poly.position.copy(pos);
    core.position.copy(pos);
  }
  onWidthResize(size);
  size();

  let t=0,running=false,raf=null;
  function frame(){
    if(!running)return;
    t+=0.01;
    poly.rotation.y+=0.0022;
    poly.rotation.x+=0.001;
    core.rotation.y-=0.003;
    const s=1+Math.sin(t*0.6)*0.04+scrollImpulse*0.12;
    poly.scale.set(s,s,s);
    const pulse=(Math.sin(t*0.5)+1)/2;
    col.copy(GREY).lerp(WHITE,pulse);
    mat.color.copy(col);
    coreMat.color.copy(WHITE);
    coreMat.opacity=0.35+pulse*0.3+scrollImpulse*0.35;
    renderer.render(scene,camera);
    raf=requestAnimationFrame(frame);
  }
  function start(){if(running)return;running=true;raf=requestAnimationFrame(frame);}
  function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=null;}

  onVisibilityChange(section,visible=>{visible?start():stop();});
  document.addEventListener('visibilitychange',()=>{document.hidden?stop():(section.getBoundingClientRect().bottom>0&&start());});

  section.classList.add('has-3d');
  start();
}
/* capabilities 3D — displaced wireframe horizon grid. One draw call (single mesh, wireframe
   material), per-frame cost is O(vertex count) sine displacement, no O(n^2) anywhere. Distinct
   language from the hero's node cluster on purpose — ambient only, no cursor/scroll reactivity. */
function initCapGrid3D(canvas){
  if(!canvas||reduce||typeof THREE==='undefined')return;
  let gl;
  try{gl=canvas.getContext('webgl2')||canvas.getContext('webgl');}catch(e){}
  if(!gl)return;

  const section=canvas.closest('#capabilities');
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(50,1,0.1,50);
  camera.position.set(0,1.7,3.1);
  camera.lookAt(0,-0.3,-4);

  const SEGX=44,SEGY=28;
  const geo=new THREE.PlaneGeometry(16,11,SEGX,SEGY);
  geo.rotateX(-Math.PI/2.15);
  const vcount=geo.attributes.position.count;
  const colorAttr=new THREE.Float32BufferAttribute(new Float32Array(vcount*3),3);
  geo.setAttribute('color',colorAttr);
  const mat=new THREE.MeshBasicMaterial({wireframe:true,transparent:true,opacity:0.2,vertexColors:true});
  const grid=new THREE.Mesh(geo,mat);
  grid.position.z=-2.5;
  scene.add(grid);

  const TROUGH=new THREE.Color(0x5a5a62),PEAK=new THREE.Color(0xffffff),mixC=new THREE.Color();
  const posAttr=geo.attributes.position;
  const base=Float32Array.from(posAttr.array);
  /* the mesh is a hard-edged rectangle — without this it just stops mid-air with a visible
     straight cutoff. Fade every vertex toward black as it nears the plane's original UV
     boundary (stable regardless of the rotateX bake above) so it dissolves into the
     black background instead of cutting off. */
  const uvAttr=geo.attributes.uv;
  const edgeT=new Float32Array(vcount);
  for(let i=0;i<vcount;i++){
    const u=uvAttr.array[i*2],v=uvAttr.array[i*2+1];
    const d=Math.min(Math.min(u,1-u),Math.min(v,1-v));
    edgeT[i]=Math.pow(Math.min(1,d*3.2),0.6);
  }
  let t=0;

  let w=0,h=0;
  function size(){
    const r=section.getBoundingClientRect();
    w=r.width;h=r.height;
    renderer.setSize(w,h,false);
    camera.aspect=w/Math.max(h,1);
    camera.updateProjectionMatrix();
    const narrow=w<700;
    camera.position.set(0,narrow?2.5:1.7,narrow?4.4:3.1);
    camera.lookAt(0,-0.3,-4);
  }
  onWidthResize(size);
  const detailsEl=section.querySelector('.cap-more');
  if(detailsEl)detailsEl.addEventListener('toggle',size);
  size();

  let running=false,raf=null;
  function frame(){
    if(!running)return;
    t+=0.015;
    const arr=posAttr.array,carr=colorAttr.array;
    for(let i=0;i<arr.length;i+=3){
      const x=base[i],y=base[i+1];
      const ripple=scrollImpulse*Math.sin(Math.abs(x)*1.3-t*5)*0.5;
      const height=Math.sin(x*0.5+t)*0.36+Math.sin(y*0.4+t*0.8)*0.26+ripple;
      arr[i+2]=height;
      const e=edgeT[i/3];
      mixC.copy(TROUGH).lerp(PEAK,Math.max(0,height/0.6));
      carr[i]=mixC.r*e;carr[i+1]=mixC.g*e;carr[i+2]=mixC.b*e;
    }
    posAttr.needsUpdate=true;
    colorAttr.needsUpdate=true;
    renderer.render(scene,camera);
    raf=requestAnimationFrame(frame);
  }
  function start(){if(running)return;running=true;raf=requestAnimationFrame(frame);}
  function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=null;}

  onVisibilityChange(section,visible=>{visible?start():stop();});
  document.addEventListener('visibilitychange',()=>{document.hidden?stop():(section.getBoundingClientRect().bottom>0&&start());});

  section.classList.add('has-3d');
  start();
}
/* hero 3D — node cluster + precomputed connection lines, single group rotation per frame.
   Draw calls: 1 instanced mesh + 1 line segments, regardless of node count. Pauses via the
   shared visibility observer (hero off-screen) and on tab-hidden — never renders unseen. */
function initHero3D(canvas){
  if(!canvas||reduce||typeof THREE==='undefined')return;
  let gl;
  try{gl=canvas.getContext('webgl2')||canvas.getContext('webgl');}catch(e){}
  if(!gl)return;

  const hero=canvas.closest('.hero');
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,1,0.1,100);
  camera.position.set(0,0,7);

  /* wireframe torus knot instead of the old sphere — distinct silhouette (ribbon-like knot,
     not another ball) with a baked top-lit gradient + an animated shimmer traveling along the
     tube, done via vertex colors so shading reads as real depth instead of flat uniform lines.
     No per-vertex displacement needed (unlike the old sphere) — cheaper per frame, not more. */
  const geo=new THREE.TorusKnotGeometry(1.9,0.55,120,10,2,3);
  const posAttr=geo.attributes.position;
  const count=posAttr.count;
  const phase=new Float32Array(count);
  const topT=new Float32Array(count);
  let minY=Infinity,maxY=-Infinity;
  for(let i=0;i<count;i++){const y=posAttr.array[i*3+1];if(y<minY)minY=y;if(y>maxY)maxY=y;}
  for(let i=0;i<count;i++){
    const x=posAttr.array[i*3],y=posAttr.array[i*3+1],z=posAttr.array[i*3+2];
    phase[i]=Math.atan2(z,x)*2+y*0.6;
    topT[i]=(y-minY)/((maxY-minY)||1);
  }
  const colorAttr=new THREE.Float32BufferAttribute(new Float32Array(count*3),3);
  geo.setAttribute('color',colorAttr);

  const mat=new THREE.MeshBasicMaterial({wireframe:true,transparent:true,opacity:0.6,vertexColors:true});
  const mesh=new THREE.Mesh(geo,mat);
  const glowMat=new THREE.MeshBasicMaterial({wireframe:true,transparent:true,opacity:0.14,vertexColors:true,blending:THREE.AdditiveBlending,depthWrite:false});
  const glow=new THREE.Mesh(geo,glowMat);
  glow.scale.setScalar(1.04);

  const group=new THREE.Group();
  group.add(glow,mesh);
  scene.add(group);

  let w=0,h=0,baseZ=7,zoomDepth=2.2;
  function size(){
    const r=hero.getBoundingClientRect();
    w=r.width;h=r.height;
    renderer.setSize(w,h,false);
    camera.aspect=w/Math.max(h,1);
    camera.updateProjectionMatrix();
    /* narrow aspect = much less horizontal FOV at the same distance, so the same world-space
       shape reads as "too big/cropped" on mobile — pull the camera back to compensate. */
    baseZ=w<700?10.5:7;
    group.scale.setScalar(w<700?0.62:1);
    /* mobile starts farther back (baseZ 10.5 vs 7) and scaled down 0.62x, so the same scroll-zoom
       distance reads as barely-there — push the zoom travel out so it's felt at the same intensity. */
    zoomDepth=w<700?4.4:2.2;
  }
  onWidthResize(size);
  size();

  let mouseX=0,mouseY=0;
  hero.addEventListener('mousemove',e=>{
    const r=hero.getBoundingClientRect();
    mouseX=((e.clientX-r.left)/w-0.5)*2;
    mouseY=((e.clientY-r.top)/h-0.5)*2;
  },{passive:true});

  let scrollT=0;
  function updateScroll(){
    const r=hero.getBoundingClientRect();
    scrollT=Math.min(Math.max(-r.top/Math.max(r.height,1),0),1);
  }
  /* rAF-coalesced: raw 'scroll' events can fire many times per frame (momentum/trackpad),
     each running getBoundingClientRect (forced layout read) — collapse to one read+write per frame. */
  let scrollPending=false;
  window.addEventListener('scroll',()=>{
    if(scrollPending)return;
    scrollPending=true;
    requestAnimationFrame(()=>{scrollPending=false;updateScroll();});
  },{passive:true});
  updateScroll();

  const carr=colorAttr.array;
  let running=false,raf=null,t=0;
  function frame(){
    if(!running)return;
    t+=0.014;
    group.rotation.y+=0.0018;
    group.rotation.x+=(mouseY*0.22-group.rotation.x)*0.04;
    group.rotation.y+=(mouseX*0.14)*0.002;
    camera.position.z=baseZ-scrollT*zoomDepth;
    group.rotation.z=scrollT*0.3;
    const ps=1+scrollImpulse*0.1;
    mesh.scale.setScalar(ps);
    glow.scale.setScalar(1.04*ps);
    for(let i=0;i<count;i++){
      const wave=(Math.sin(phase[i]+t)+1)*0.5;
      const b=0.2+topT[i]*0.35+wave*0.45+scrollImpulse*0.3;
      carr[i*3]=b;carr[i*3+1]=b;carr[i*3+2]=b;
    }
    colorAttr.needsUpdate=true;
    renderer.render(scene,camera);
    raf=requestAnimationFrame(frame);
  }
  function start(){if(running)return;running=true;raf=requestAnimationFrame(frame);}
  function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=null;}

  onVisibilityChange(hero,visible=>{visible?start():stop();});
  document.addEventListener('visibilitychange',()=>{document.hidden?stop():(hero.getBoundingClientRect().bottom>0&&start());});

  hero.classList.add('has-3d');
  start();
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
  ['.steps .step'].forEach(sel=>{
    ScrollTrigger.batch(gsap.utils.toArray(sel),{start:'top 90%',fastScrollEnd:true,
      onEnter:b=>gsap.fromTo(b,{opacity:0},{opacity:1,duration:0.6,stagger:0.06,ease:'power2.out',overwrite:true})});
  });
  /* pricing tiers — each column enters from its own direction (left card from left, feat card
     up+scale, right card from right) instead of a flat fade. Pure 2D transform, once:true. */
  gsap.utils.toArray('.tiers .tier').forEach((tier,i)=>{
    const from=i===0?{x:-50,opacity:0}:i===gsap.utils.toArray('.tiers .tier').length-1?{x:50,opacity:0}:{y:36,opacity:0,scale:0.96};
    gsap.fromTo(tier,from,{x:0,y:0,scale:1,opacity:1,duration:0.8,ease:'power3.out',
      scrollTrigger:{trigger:tier,start:'top 90%',once:true,fastScrollEnd:true}});
  });
  /* capabilities (01) — alternating left/right slide by column, 2D translate only (no
     rotateX/perspective — that's what forced a compositing layer per card right as Lenis hands
     off from the hero and read as scroll lag; plain translateX doesn't have that cost). */
  ScrollTrigger.batch(gsap.utils.toArray('#capabilities .cap-grid .cap'),{start:'top 94%',fastScrollEnd:true,
    onEnter:b=>b.forEach((el,i)=>gsap.fromTo(el,{opacity:0,x:i%2===0?-26:26},
      {opacity:1,x:0,duration:0.7,delay:i*0.05,ease:'power2.out',overwrite:true}))});
  /* book/closing (05) — copy and calendar converge from opposite sides */
  gsap.fromTo('.book-grid>div:first-child',{opacity:0,x:-40},
    {opacity:1,x:0,duration:0.9,ease:'power3.out',scrollTrigger:{trigger:'.book-grid',start:'top 85%',once:true,fastScrollEnd:true}});
  gsap.fromTo('.book-grid>div:last-child',{opacity:0,x:40},
    {opacity:1,x:0,duration:0.9,ease:'power3.out',scrollTrigger:{trigger:'.book-grid',start:'top 85%',once:true,fastScrollEnd:true}});
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

/* UI click ticks — procedural Web Audio, no asset files, no autoplay (only ever plays inside a
   click handler, which is itself a user gesture). One shared, lazily-created AudioContext. */
if(!reduce){
  let actx=null;
  function tickCtx(){
    if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==='suspended')actx.resume();
    return actx;
  }
  function tick(freq,dur,vol){
    const ctx=tickCtx();
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='sine';osc.frequency.value=freq;
    gain.gain.setValueAtTime(vol,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();osc.stop(ctx.currentTime+dur+0.02);
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('.btn-fill,.navcta')){tick(880,0.05,0.045);}
    else if(e.target.closest('#modeToggle button')){tick(660,0.045,0.04);}
    else if(e.target.closest('.wseg')){tick(740,0.04,0.04);}
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
/* integrations backdrop — sparse node network reclaims the "connected systems" motif the
   hero used to use (now free since hero moved to the torus knot). Kept faint/ambient since
   the colorful brand-logo marquee sits on top of it and must stay the visual focus. */
function initIntegNodes3D(canvas){
  if(!canvas||reduce||typeof THREE==='undefined')return;
  let gl;
  try{gl=canvas.getContext('webgl2')||canvas.getContext('webgl');}catch(e){}
  if(!gl)return;

  const section=canvas.closest('#integrations');
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,1,0.1,100);
  camera.position.set(0,0,7);

  const COUNT=32,RADIUS=4.6;
  const pts=[];
  for(let i=0;i<COUNT;i++){
    const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize();
    v.multiplyScalar(RADIUS*(0.7+Math.random()*0.4));
    pts.push(v);
  }
  const nodeGeo=new THREE.IcosahedronGeometry(0.045,0);
  const nodeMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.35});
  const nodes=new THREE.InstancedMesh(nodeGeo,nodeMat,COUNT);
  const m=new THREE.Matrix4();
  pts.forEach((p,i)=>{m.setPosition(p);nodes.setMatrixAt(i,m);});

  const linePositions=[];
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++)
    if(pts[i].distanceTo(pts[j])<2.1)linePositions.push(pts[i].x,pts[i].y,pts[i].z,pts[j].x,pts[j].y,pts[j].z);
  const lineGeo=new THREE.BufferGeometry();
  lineGeo.setAttribute('position',new THREE.Float32BufferAttribute(linePositions,3));
  const lineMat=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.1});
  const lines=new THREE.LineSegments(lineGeo,lineMat);

  const group=new THREE.Group();
  group.add(nodes,lines);
  scene.add(group);

  let w=0,h=0;
  function size(){
    const r=section.getBoundingClientRect();
    w=r.width;h=r.height;
    renderer.setSize(w,h,false);
    camera.aspect=w/Math.max(h,1);
    camera.updateProjectionMatrix();
    camera.position.z=w<700?9.5:7;
  }
  onWidthResize(size);
  size();

  let running=false,raf=null,t=0;
  function frame(){
    if(!running)return;
    t+=0.01;
    group.rotation.y+=0.0012;
    group.rotation.x=Math.sin(t*0.2)*0.08;
    nodeMat.opacity=0.35+scrollImpulse*0.4;
    lineMat.opacity=0.1+scrollImpulse*0.25;
    renderer.render(scene,camera);
    raf=requestAnimationFrame(frame);
  }
  function start(){if(running)return;running=true;raf=requestAnimationFrame(frame);}
  function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=null;}

  onVisibilityChange(section,visible=>{visible?start():stop();});
  document.addEventListener('visibilitychange',()=>{document.hidden?stop():(section.getBoundingClientRect().bottom>0&&start());});

  section.classList.add('has-3d');
  start();
}
/* hidden-cost backdrop — concentric rings expanding outward on a loop, "cost compounding the
   longer you wait" motif. Distinct shape language from every other section (rings, not
   network/terrain/knot/polyhedron). Kept faint behind the interactive wheel in front. */
function initCostRings3D(canvas){
  if(!canvas||reduce||typeof THREE==='undefined')return;
  let gl;
  try{gl=canvas.getContext('webgl2')||canvas.getContext('webgl');}catch(e){}
  if(!gl)return;

  const section=canvas.closest('#hidden-cost');
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,1,0.1,50);
  camera.position.set(0,0,6);

  const RING_N=4;
  const group=new THREE.Group();
  group.rotation.x=-0.5;
  const rings=[];
  for(let i=0;i<RING_N;i++){
    const geo=new THREE.RingGeometry(0.94,0.965,64);
    const mat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,side:THREE.DoubleSide});
    const ring=new THREE.Mesh(geo,mat);
    group.add(ring);
    rings.push({mesh:ring,mat,phase:i/RING_N});
  }
  scene.add(group);

  let w=0,h=0;
  function size(){
    const r=section.getBoundingClientRect();
    w=r.width;h=r.height;
    renderer.setSize(w,h,false);
    camera.aspect=w/Math.max(h,1);
    camera.updateProjectionMatrix();
    camera.position.z=w<700?8:6;
  }
  onWidthResize(size);
  size();

  let running=false,raf=null,t=0;
  function frame(){
    if(!running)return;
    t+=0.006;
    group.rotation.z+=0.0008;
    rings.forEach(r=>{
      const lt=(t+r.phase)%1;
      const s=0.4+lt*3.6;
      r.mesh.scale.setScalar(s);
      r.mat.opacity=(1-lt)*0.14+scrollImpulse*0.3;
    });
    renderer.render(scene,camera);
    raf=requestAnimationFrame(frame);
  }
  function start(){if(running)return;running=true;raf=requestAnimationFrame(frame);}
  function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=null;}

  onVisibilityChange(section,visible=>{visible?start():stop();});
  document.addEventListener('visibilitychange',()=>{document.hidden?stop():(section.getBoundingClientRect().bottom>0&&start());});

  section.classList.add('has-3d');
  start();
}
initHero3D(document.getElementById('hero3d'));
initCapGrid3D(document.getElementById('cap3d'));
initBookPoly3D(document.getElementById('book3d'));
initIntegNodes3D(document.getElementById('integ3d'));
initCostRings3D(document.getElementById('cost3d'));
