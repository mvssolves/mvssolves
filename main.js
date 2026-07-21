gsap.registerPlugin(ScrollTrigger);
/* `reduce` and `lenis` come from shared.js, loaded before this file on every page that includes
   both -- declared once there so the two scripts don't fight over the same top-level binding. */
const isDesktop = window.matchMedia('(min-width:901px)').matches;

/* one shared IntersectionObserver (threshold:0) for the handful of independent single-element
   visibility toggles below (ElectricBorder in-view, hero-off, prem spin-off, carousel spin-off) —
   was 4 separate observer instances doing the same threshold:0 visibility-flag pattern. */
const _visibilityObserver=new IntersectionObserver(es=>{
  es.forEach(e=>{(e.target.__onVisible||[]).forEach(cb=>cb(e.isIntersecting));});
},{threshold:0});
function onVisibilityChange(el,cb){(el.__onVisible=el.__onVisible||[]).push(cb);_visibilityObserver.observe(el);}

/* GradualSpacingText (Eldora UI) — letters assemble in from a slight offset instead of the
   whole heading fading/rising as one block. Plain runtime DOM-split + GSAP, no build step. */
function splitChars(el){
  const text=el.textContent;
  el.textContent='';
  const spans=[];
  [...text].forEach(ch=>{
    const s=document.createElement('span');s.className='fx-char';s.style.display='inline-block';
    s.textContent=ch===' '?' ':ch; /* plain space collapses to 0-width inside inline-block, nbsp doesn't */
    el.appendChild(s);spans.push(s);
  });
  return spans;
}
function gradualSpacingHeading(el){
  if(!el||reduce||el.children.length)return null; /* has nested markup (e.g. <em>) -- don't flatten it */
  const chars=splitChars(el);
  gsap.set(chars,{opacity:0,x:-10}); /* explicit set, not relying on fromTo's immediateRender under paused:true */
  return {chars,tween:gsap.to(chars,{opacity:1,x:0,duration:0.5,stagger:0.035,ease:'power2.out',paused:true})};
}
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
/* mobile GPUs pay hard for MSAA + high pixel-ratio fragment cost — narrow viewports skip both.
   Read once at renderer-creation time (matches the same <700 breakpoint every scene's own
   size() already uses for camera/geometry tuning), not re-evaluated on resize: the 901px
   breakpoint change above already forces a full reload, which recreates every renderer fresh. */
function mobileGfxOpts(){
  const narrow=window.innerWidth<700;
  /* desktop cap dropped 1.5→1.25 — on a retina/DPR-2 display six canvases at 1.5x were rendering
     ~2500px-wide framebuffers each, the dominant scroll-time GPU cost (measured: worst frame 55ms
     mid-scroll). 1.25² vs 1.5² ≈ 31% less fragment work across every scene, imperceptible sharpness
     drop. */
  return{antialias:!narrow,dpr:narrow?1:Math.min(window.devicePixelRatio||1,1.25)};
}
/* ambient scenes (drifting particles / node fields — not the hero fly-through or the cursor grid)
   run at 30fps instead of 60: their motion is slow enough that half the frames are invisible, and
   several render simultaneously as adjacent sections cross the viewport mid-scroll. Halves their
   per-frame cost. Returns true when this frame should render, false to skip. */
function halfRate(scene){scene.__hr=!scene.__hr;return scene.__hr;}
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
if(!reduce)gsap.ticker.lagSmoothing(0);
if(!reduce&&isDesktop){
  lenis=new Lenis({duration:1.2,syncTouch:false});
  gsap.ticker.add(t=>lenis.raf(t*1000));
  lenis.on('scroll',ScrollTrigger.update);
}

/* dynamic pill nav — sliding highlight follows hover (desktop) / tap (touch), rests on active link */
(function(){
  const links=document.getElementById('navLinks'),hl=document.getElementById('navHl');
  if(!links||!hl)return;
  const anchors=[...links.querySelectorAll('a')];
  let active=anchors[0];
  function move(el){if(!el)return;hl.style.opacity='1';hl.style.transform=`translateX(${el.offsetLeft}px)`;hl.style.width=el.offsetWidth+'px';}
  anchors.forEach(a=>{
    a.addEventListener('mouseenter',()=>move(a));
    a.addEventListener('click',e=>{
      active=a;move(a);
      if(reduce)return;
      const r=a.getBoundingClientRect(),d=Math.max(r.width,r.height)*1.4;
      const s=document.createElement('span');
      s.className='nav-ripple';
      s.style.width=s.style.height=d+'px';
      s.style.left=(e.clientX-r.left-d/2)+'px';
      s.style.top=(e.clientY-r.top-d/2)+'px';
      a.appendChild(s);
      s.addEventListener('animationend',()=>s.remove());
    });
  });
  links.addEventListener('mouseleave',()=>move(active));
  requestAnimationFrame(()=>move(active));
  window.addEventListener('resize',()=>move(active),{passive:true});
})();

/* crisp fade+rise reveal — no blur filter. filter:blur() mid-transition reads soft/laggy, not
   crisp, and is a real GPU compositing cost on top of it. Pure opacity+translateY on a tight
   cubic-bezier is the same recipe Browne's Mobile Detailing site uses site-wide (its .reveal
   class) and reads noticeably crisper. feat-card excluded: the fold-stack pin/cover further
   down is its own entrance, a second fade-in on top of that would fight it. */
(function(){
  if(reduce||typeof gsap==='undefined'||typeof ScrollTrigger==='undefined')return;
  gsap.utils.toArray('.hiw-step, .trust-card, .testi-card, .tier, .book-copy, .book-cal, #about > .wrap > p').forEach(el=>{
    gsap.fromTo(el,{opacity:0,y:32},{
      opacity:1,y:0,duration:.75,ease:'expo.out',
      scrollTrigger:{trigger:el,start:'top 88%',once:true}
    });
  });
})();

/* back-to-top button lives in shared.js now (loaded on every page, not just this one). */

/* scroll progress */
const prog=document.getElementById('progress');
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
function onScroll(y){
  const pct=scrollableH>0?(y/scrollableH*100):0;
  prog.style.width=pct+'%';}
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
  const gfx=mobileGfxOpts();
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:gfx.antialias});
  renderer.setPixelRatio(gfx.dpr);
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
    raf=requestAnimationFrame(frame);
    if(!halfRate(scene))return;   // ambient — 30fps
    t+=0.02;
    poly.rotation.y+=0.0044;
    poly.rotation.x+=0.002;
    core.rotation.y-=0.006;
    const s=1+Math.sin(t*0.6)*0.04+scrollImpulse*0.12;
    poly.scale.set(s,s,s);
    const pulse=(Math.sin(t*0.5)+1)/2;
    col.copy(GREY).lerp(WHITE,pulse);
    mat.color.copy(col);
    coreMat.color.copy(WHITE);
    coreMat.opacity=0.35+pulse*0.3+scrollImpulse*0.35;
    renderer.render(scene,camera);
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
  const gfx=mobileGfxOpts();
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:gfx.antialias});
  renderer.setPixelRatio(gfx.dpr);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(50,1,0.1,50);
  camera.position.set(0,1.7,3.1);
  camera.lookAt(0,-0.3,-4);

  /* cursor-reactive GLSL grid floor instead of the equalizer cubes — ported from a real
     reference found in the 3D pack (a Codrops-style shader plane: vertex-shader bump toward
     the cursor + raised edges, fragment-shader anti-aliased grid lines via fwidth). Runs
     entirely on the GPU (one ShaderMaterial, one draw call) instead of a per-frame JS loop
     over instances — genuinely cheaper than the cube grid it replaces, not just different-
     looking. No render target/post-processing involved, same safe pattern as the hero shader. */
  const gridGeo=new THREE.PlaneGeometry(16,11,110,70);
  const gridMat=new THREE.ShaderMaterial({
    uniforms:{
      uEdgeWidth:{value:0.16},
      uEdgeAmp:{value:0.55},
      uCenterRadius:{value:0.26},
      uCenterAmp:{value:0.5},
      uCenter:{value:new THREE.Vector2(0.5,0.5)},
      uTime:{value:0},
      uImpulse:{value:0},
      uGridScale:{value:26.0},
      uLineWidth:{value:0.6}
    },
    vertexShader:`
      varying vec2 vUv;
      uniform float uEdgeWidth;
      uniform float uEdgeAmp;
      uniform float uCenterRadius;
      uniform float uCenterAmp;
      uniform vec2 uCenter;
      uniform float uImpulse;
      void main(){
        vUv=uv;
        vec3 p=position;
        float dEdge=min(min(vUv.x,1.0-vUv.x),min(vUv.y,1.0-vUv.y));
        float edgeMask=1.0-smoothstep(0.0,uEdgeWidth,dEdge);
        float dCenter=distance(vUv,uCenter);
        float centerMask=1.0-smoothstep(0.0,uCenterRadius,dCenter);
        p.z+=edgeMask*uEdgeAmp*(1.0+uImpulse*0.8)+centerMask*uCenterAmp;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
      }
    `,
    fragmentShader:`
      varying vec2 vUv;
      uniform float uGridScale;
      uniform float uLineWidth;
      uniform float uTime;
      uniform float uImpulse;
      float gridLine(float coord,float width){
        float fw=fwidth(coord);
        float p=abs(fract(coord-0.5)-0.5);
        return 1.0-smoothstep(width*fw,(width+1.0)*fw,p);
      }
      void main(){
        vec2 uv=(vUv+vec2(uTime*0.015,0.0))*uGridScale;
        float g=max(gridLine(uv.x,uLineWidth),gridLine(uv.y,uLineWidth));
        vec3 col=mix(vec3(0.0),vec3(1.0),g*(0.55+uImpulse*0.4));
        gl_FragColor=vec4(col,1.0);
      }
    `
  });
  const grid=new THREE.Mesh(gridGeo,gridMat);
  grid.rotation.x=-Math.PI/2.15;
  grid.position.z=-2.5;
  scene.add(grid);

  /* cursor position mapped to plane UV, lerped toward smoothly (same 0.08 lerp as the
     reference) so the floor bump follows the pointer rather than snapping to it. */
  let targetU=0.5,targetV=0.5;
  section.addEventListener('mousemove',e=>{
    const r=section.getBoundingClientRect();
    targetU=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));
    targetV=Math.min(1,Math.max(0,1-(e.clientY-r.top)/r.height));
  },{passive:true});

  let t=0;

  let w=0,h=0;
  function size(){
    const r=section.getBoundingClientRect();
    w=r.width;h=r.height;
    renderer.setSize(w,h,false);
    camera.aspect=w/Math.max(h,1);
    camera.updateProjectionMatrix();
    const narrow=w<700;
    camera.position.set(0,narrow?3.6:1.7,narrow?6.4:3.1);
    camera.lookAt(0,-0.3,-4);
    /* narrow FOV fits far fewer grid cells across the width than desktop, so each cell (and
       its line) reads chunky/oversized at the same grid scale — finer grid + thinner lines
       fixes the density, pulling the camera back alone didn't. */
    gridMat.uniforms.uGridScale.value=narrow?42.0:26.0;
    gridMat.uniforms.uLineWidth.value=narrow?0.4:0.6;
  }
  onWidthResize(size);
  const detailsEl=section.querySelector('.cap-more');
  if(detailsEl)detailsEl.addEventListener('toggle',size);
  size();

  let running=false,raf=null;
  function frame(){
    if(!running)return;
    t+=0.016;
    gridMat.uniforms.uTime.value=t;
    gridMat.uniforms.uImpulse.value=scrollImpulse;
    const c=gridMat.uniforms.uCenter.value;
    c.x+=(targetU-c.x)*0.08;
    c.y+=(targetV-c.y)*0.08;
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
  const gfx=mobileGfxOpts();
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:gfx.antialias});
  renderer.setPixelRatio(gfx.dpr);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,1,0.1,100);
  camera.position.set(0,0,7);

  /* full "MVS" wordmark, not just the M — hand-built the same way as before (core THREE.Shape +
     ExtrudeGeometry only, no FontLoader/addons; that path broke the entire page earlier this
     session, every section's 3D, not just the hero — not worth retrying blind for typography
     alone). M and V are single-outline polygons with a notch (same trick, straight edges only);
     S is a blocky pixel-grid S (3-wide/5-tall block pattern, traced as one outline) rather than a
     curvy script S — keeps the same hard-edged geometric language as M/V instead of mixing in
     smooth bezier curves. */
  const light=new THREE.DirectionalLight(0xffffff,2.6);
  light.position.set(2.4,3,2.5);
  const fill=new THREE.DirectionalLight(0xffffff,0.5);
  fill.position.set(-3,-1.8,1.6);
  /* rim/back light — grazes the edges from behind so the bevels catch a bright specular streak as
     the wordmark turns. This is what separates "premium chrome" from "flat grey object": edge
     highlights that travel across the metal, not just front fill. */
  const rim=new THREE.DirectionalLight(0xffffff,1.6);
  rim.position.set(-1.5,2.5,-3);
  scene.add(light,fill,rim,new THREE.AmbientLight(0xffffff,0.32));
  const group=new THREE.Group();
  scene.add(group);
  const word=new THREE.Group();
  group.add(word);

  /* real reflections + brushed-metal surface detail — a tiny canvas-drawn gradient run through
     PMREMGenerator for the environment (so metal actually reflects something instead of just
     scattering two directional lights), and a canvas-drawn scratch pattern for the roughness map
     (so it reads as brushed/imperfect, not uniformly smooth plastic). No external HDRI/texture
     file fetched — both textures are generated locally. PMREMGenerator/CanvasTexture are core
     three.js (same module already proven safe all session), not examples/jsm addons — none of
     the FontLoader-style bare-specifier risk. */
  function makeEnvTexture(){
    const c=document.createElement('canvas');
    c.width=128;c.height=128;
    const ctx=c.getContext('2d');
    /* studio-lightbox environment, not a flat grey ramp — a bright sky top, a hard bright horizon
       band (the classic softbox streak a chrome logo reflects), then a dark floor. Reflecting THIS
       gives the metal real light/dark contrast and a moving highlight instead of dull uniform grey. */
    const g=ctx.createLinearGradient(0,0,0,128);
    g.addColorStop(0.00,'#c8ccd2');
    g.addColorStop(0.34,'#8a8f96');
    g.addColorStop(0.44,'#ffffff');   // horizon softbox — the bright reflected streak
    g.addColorStop(0.50,'#ffffff');
    g.addColorStop(0.60,'#3a3d42');
    g.addColorStop(1.00,'#0c0d0f');
    ctx.fillStyle=g;
    ctx.fillRect(0,0,128,128);
    /* a couple of soft vertical light bars — extra reflected highlights that sweep across the
       facets as the wordmark rotates, so the chrome reads as being in a real lit room. */
    ['rgba(255,255,255,.5)','rgba(255,255,255,.32)'].forEach((col,i)=>{
      ctx.fillStyle=col;
      ctx.fillRect(24+i*70, 10, 10, 108);
    });
    const tex=new THREE.CanvasTexture(c);
    tex.mapping=THREE.EquirectangularReflectionMapping;
    return tex;
  }
  function makeScratchTexture(){
    const c=document.createElement('canvas');
    c.width=256;c.height=256;
    const ctx=c.getContext('2d');
    ctx.fillStyle='#707070';
    ctx.fillRect(0,0,256,256);
    for(let i=0;i<140;i++){
      const y=Math.random()*256,x=Math.random()*256,len=20+Math.random()*90;
      ctx.strokeStyle=`rgba(255,255,255,${(0.06+Math.random()*0.16).toFixed(3)})`;
      ctx.lineWidth=Math.random()*1.1+0.2;
      ctx.beginPath();
      ctx.moveTo(x,y);
      ctx.lineTo(x+len,y+(Math.random()-0.5)*10);
      ctx.stroke();
    }
    const tex=new THREE.CanvasTexture(c);
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.repeat.set(2,1.5);
    return tex;
  }
  const pmrem=new THREE.PMREMGenerator(renderer);
  scene.environment=pmrem.fromEquirectangular(makeEnvTexture()).texture;
  pmrem.dispose();

  /* smooth-shaded now (flatShading dropped) — flat shading was giving it that low-poly faceted
     look; smooth normals + the env reflection read as real polished chrome. Lower roughness for a
     sharper reflection, scratch map still there for brushed micro-detail, higher envMapIntensity
     so the new studio env actually shows. */
  const mat=new THREE.MeshStandardMaterial({color:0xffffff,
    roughness:0.34,metalness:0.95,roughnessMap:makeScratchTexture(),envMapIntensity:2.0,transparent:true});
  /* soft white glow shell per letter — same geometry, no extra memory, drawn from the inside
     (BackSide) with additive blending so it reads as a faint aura rather than a second solid
     object. No EffectComposer/bloom (banned — real GPU-compat bug hit earlier with that route). */
  const glowMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.16,
    side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false});

  /* round every corner of a polygon into a soft fillet — turns the hard-edged block letterforms
     (especially the crude pixel-step S) into clean rounded-geometric glyphs that read as
     considered type, not primitives. Per-corner radius is clamped to half the shorter adjacent
     edge so short segments (the S's arms) never over-round into overlap. */
  function roundedShape(pts,r){
    const s=new THREE.Shape();
    const n=pts.length, P=pts.map(p=>({x:p[0],y:p[1]}));
    for(let i=0;i<n;i++){
      const cur=P[i], prev=P[(i-1+n)%n], next=P[(i+1)%n];
      const d1=Math.hypot(cur.x-prev.x,cur.y-prev.y), d2=Math.hypot(next.x-cur.x,next.y-cur.y);
      const rr=Math.min(r, d1/2, d2/2);
      const p1={x:cur.x+(prev.x-cur.x)/d1*rr, y:cur.y+(prev.y-cur.y)/d1*rr};
      const p2={x:cur.x+(next.x-cur.x)/d2*rr, y:cur.y+(next.y-cur.y)/d2*rr};
      if(i===0)s.moveTo(p1.x,p1.y); else s.lineTo(p1.x,p1.y);
      s.quadraticCurveTo(cur.x,cur.y,p2.x,p2.y);
    }
    s.closePath();
    return s;
  }
  /* curveSegments bumped 1→6 so the rounded corners actually render as curves, bevel smoothed. */
  function letterMesh(shape){
    const geo=new THREE.ExtrudeGeometry(shape,{depth:3.4,bevelEnabled:true,bevelThickness:0.36,bevelSize:0.24,bevelSegments:3,curveSegments:6});
    geo.computeBoundingBox();
    const bb=geo.boundingBox;
    geo.translate(-(bb.max.x+bb.min.x)/2,-(bb.max.y+bb.min.y)/2,-(bb.max.z+bb.min.z)/2);
    const mesh=new THREE.Mesh(geo,mat);
    const glow=new THREE.Mesh(geo,glowMat);
    glow.scale.setScalar(1.08);
    mesh.add(glow);
    return mesh;
  }

  /* real block M — two vertical stems + a thin V-chevron hanging from the top between them,
     with genuinely open counters (the gaps between each stem and the chevron). Every earlier
     attempt failed because the chevron was too fat / the bottom stayed solid, fusing the stems
     into a block. These exact vertices were verified two ways before shipping: 15 point-in-
     polygon assertions (stems solid, both counters open, chevron strokes solid, top notch +
     center bridge present) AND a rasterized preview of the flat outline. Trace clockwise:
       stem tops + chevron inner edges meeting high at (5,4.5) = the top notch;
       then down each stem outer/inner, and the chevron UNDERSIDE — its outer edges leave the
       stems high (y=8.5) and meet at a low tip (5,2), which is what opens the two counters. */
  /* M — the geometry-verified vertices (two stems + hanging chevron + open counters), now fed
     through roundedShape so the stem corners and chevron tip get soft fillets. Modest radius keeps
     the M crisp/recognizable. */
  const mShape=roundedShape([
    [0,0],[0,12],[2.4,12],[5,4.5],[7.6,12],[10,12],[10,0],[7.6,0],[7.6,8.5],[5,2],[2.4,8.5],[2.4,0]
  ],0.7);
  const vShape=roundedShape([
    [0,12],[4.7,0],[9.4,12],[6.8,12],[4.7,3.5],[2.6,12]
  ],0.7);
  /* real curved S — an actual S ribbon, not a pixel block or a rounded block (both read as 5/G).
     Built offline as a constant-width stroke offset from a hand-placed S centerline (Catmull-Rom
     spine → ±half-width offset → rounded end caps), the closed outline sampled to these 64 points
     and verified as a clean S by rasterizing the exact polygon before porting. Already smooth, so
     it's used as a straight point-polygon (no roundedShape). */
  const S_PTS=[[2.1,2.76],[1.4,3.23],[0.69,3.64],[0.44,3.69],[-0.04,3.58],[-0.58,3.34],[-1.04,3.01],[-1.38,2.64],[-1.41,2.59],[-1.4,2.47],[-1.31,2.24],[-1.14,2.08],[-0.65,1.73],[-0.21,1.43],[0.11,1.26],[0.56,1.03],[0.94,0.87],[1.57,0.56],[2.24,0.11],[3.0,-0.5],[3.76,-1.48],[4.01,-2.64],[3.84,-3.75],[3.26,-4.76],[2.42,-5.51],[1.44,-6.04],[0.35,-6.28],[-0.64,-6.27],[-1.66,-6.1],[-2.69,-5.79],[-3.32,-5.56],[-1.69,-4.73],[-2.52,-3.09],[-1.83,-3.33],[-1.03,-3.58],[-0.42,-3.67],[0.15,-3.68],[0.52,-3.61],[0.92,-3.38],[1.29,-3.06],[1.38,-2.91],[1.41,-2.69],[1.4,-2.58],[1.24,-2.41],[0.7,-1.99],[0.28,-1.69],[-0.06,-1.53],[-0.6,-1.29],[-1.03,-1.08],[-1.57,-0.79],[-2.12,-0.42],[-2.8,0.08],[-3.54,0.9],[-3.92,1.83],[-3.99,2.95],[-3.53,4.11],[-2.76,4.95],[-1.86,5.6],[-0.89,6.04],[0.3,6.29],[1.73,6.03],[2.84,5.39],[3.46,4.98],[1.67,4.55]];
  const sShape=new THREE.Shape();
  S_PTS.forEach((p,i)=>i?sShape.lineTo(p[0],p[1]):sShape.moveTo(p[0],p[1]));
  sShape.closePath();

  const mMesh=letterMesh(mShape);
  const vMesh=letterMesh(vShape);
  const sMesh=letterMesh(sShape);
  /* laid out so the V sits exactly at word-local x=0 — the scroll fly-through below drifts the
     whole wordmark toward screen-center as it approaches the camera, so the moment it's biggest/
     closest lines up with the V's own gap passing through center, not an arbitrary point. */
  const GAP=1.6;
  mMesh.position.x=-(4.7+GAP+5);
  sMesh.position.x=4.7+GAP+4.0;   // curved S is ~8 wide (half ~4.0)
  word.add(mMesh,vMesh,sMesh);

  /* real bounding sphere of the whole wordmark (not a hand-guessed number) — M is wider than S,
     so the sphere's center isn't exactly at the V/word origin; used as-is (center + radius) below
     so the frustum-safe clamp is correct instead of assuming false symmetry. */
  const wordSphere=new THREE.Box3().setFromObject(word).getBoundingSphere(new THREE.Sphere());

  let w=0,h=0,baseZ=7,wordScale=0.1,restX=0,restY=0;
  function size(){
    const r=hero.getBoundingClientRect();
    w=r.width;h=r.height;
    renderer.setSize(w,h,false);
    const aspect=w/Math.max(h,1);
    camera.aspect=aspect;
    camera.updateProjectionMatrix();
    const narrow=w<700;
    baseZ=narrow?13.5:9.2;
    wordScale=narrow?0.072:0.115;
    word.scale.setScalar(wordScale);
    camera.position.z=baseZ;
    /* frustum-safe rest position — same reasoning/method as the single-M pass: derive the safe
       edge from the actual aspect/baseZ/bounding-sphere instead of a fixed world-unit guess, so
       it doesn't clip off-screen on in-between "desktop" window widths (700-900px). */
    const halfW=baseZ*Math.tan(45*Math.PI/360)*aspect;
    const margin=0.3;
    const R=wordSphere.radius*wordScale,cx=wordSphere.center.x*wordScale;
    const xMax=halfW-margin-R-cx;
    const xPreferred=narrow?1.1:3.4;
    restX=Math.max(narrow?0.6:1.0,Math.min(xPreferred,xMax));
    restY=narrow?-2.0:-0.3;
  }
  onWidthResize(size);
  size();

  let mouseX=0,mouseY=0;
  hero.addEventListener('mousemove',e=>{
    const r=hero.getBoundingClientRect();
    mouseX=((e.clientX-r.left)/w-0.5)*2;
    mouseY=((e.clientY-r.top)/h-0.5)*2;
  },{passive:true});

  let scrollT=0,heroVisible=true;
  function updateScroll(){
    const r=hero.getBoundingClientRect();
    scrollT=Math.min(Math.max(-r.top/Math.max(r.height,1),0),1);
  }
  /* rAF-coalesced: raw 'scroll' events can fire many times per frame (momentum/trackpad),
     each running getBoundingClientRect (forced layout read) — collapse to one read+write per
     frame. Also skip entirely once the hero has scrolled off-screen — this listener never got
     torn down, so it was running a forced layout read on every scroll anywhere on the page
     (footer, pricing, wherever) for the rest of the visit. */
  let scrollPending=false;
  window.addEventListener('scroll',()=>{
    if(scrollPending||!heroVisible)return;
    scrollPending=true;
    requestAnimationFrame(()=>{scrollPending=false;updateScroll();});
  },{passive:true});
  updateScroll();

  let running=false,raf=null,t=0;
  function frame(){
    if(!running)return;
    t+=0.014;
    /* bounded wobble, not a continuous spin — a spinning ABSTRACT shape reads fine from any
       angle, but real letterforms only read as "MVS" within a narrow angle near face-on. A
       continuous accumulating rotation was drifting it through wide angles where it stopped
       looking like the wordmark at all (confirmed against a real screenshot, not just theory).
       Slow sine oscillation keeps it always within a legible range while still feeling alive. */
    word.rotation.y=Math.sin(t*0.15)*0.14;
    word.rotation.x=Math.sin(t*0.11+1.3)*0.07;
    /* scroll fly-through — eased (scrollT²) so it starts slow and rushes at the very end. The
       wordmark drifts from its rest corner toward dead-center (reaching center at ~77% of the
       hero's scroll range) WHILE growing and approaching the camera, so the moment it's biggest/
       closest is also the moment the V's gap is centered on the camera's own axis — "flying
       through the V" rather than just a shape growing in place. Fades out over the last 40% of
       travel so it doesn't just clip through the near plane. */
    const st=scrollT*scrollT;
    const centerT=Math.min(1,scrollT*1.3);
    word.position.x=restX*(1-centerT);
    word.position.y=restY*(1-centerT);
    word.position.z=st*baseZ*0.9;
    word.scale.setScalar(wordScale*(1+scrollImpulse*0.05)*(1+st*3.2));
    const fadeStart=0.6;
    const op=scrollT>fadeStart?Math.max(0,1-(scrollT-fadeStart)/(1-fadeStart)):1;
    mat.opacity=op;
    glowMat.opacity=0.16*op;
    group.rotation.x+=(mouseY*0.18-group.rotation.x)*0.04;
    group.rotation.y+=(mouseX*0.12)*0.002;
    light.intensity=3.0+scrollImpulse*1.2;
    fill.intensity=0.6+scrollImpulse*0.3;
    renderer.render(scene,camera);
    raf=requestAnimationFrame(frame);
  }
  function start(){if(running)return;running=true;raf=requestAnimationFrame(frame);}
  function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=null;}

  onVisibilityChange(hero,visible=>{heroVisible=visible;visible?start():stop();});
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
  document.querySelectorAll('h1 .line').forEach((span,i)=>fadeIn(span,i*0.1));
  /* hero lede gets its own entrance -- was the one piece of above-the-fold copy with zero
     animation (h1 already has its per-line flick reveal). Fade-up + a one-shot gradient shine
     sweep across the text (CSS in index.html, .shine-text/.shine-in), triggered here rather than
     via ScrollTrigger since above-the-fold content needs to play on LOAD, not on scroll-into-view
     (it's already in view at load). */
  const sub=document.querySelector('.h-sub');
  if(sub){
    sub.classList.add('shine-text');
    gsap.fromTo(sub,{opacity:0,y:14},{opacity:1,y:0,duration:0.6,delay:0.25,ease:'power2.out',
      onComplete:()=>sub.classList.add('shine-in')});
  }
  /* CTA buttons no longer fade in after the headline -- reported as reading like a bug
     ("buttons not fully visible yet") rather than a polish flourish. Render at full opacity
     immediately instead of staggering in. */
}


/* section heading reveals. once:true on every scrollTrigger below, both viewports -- without it,
   GSAP's default toggleActions ('play none none reverse') un-plays each reveal (fades back to its
   "from" state) the moment you scroll back up past its start point, then replays it scrolling back
   down. With this many reveals stacked down the page, any bit of scroll wobble (trackpad, momentum
   overshoot) made half the page flicker in/out. Tried a replay-on-scroll variant on mobile, then on
   desktop (per two rounds of explicit requests) -- both times it reintroduced exactly this same
   flicker, reported back as "mobile scroll logic messed up" and then "site feels drained, missing
   reveals/hover" once it moved to desktop. Reverted for good: once:true is the stable, proven
   behavior every other pin/reveal effect on this page already relies on. */
  const rt={once:true};
if(!reduce){
  /* plain headings (subpages: FAQ, careers, legal, book-a-call) — GradualSpacingText: letters
     assemble in from a slight offset instead of the whole block just fading+rising as one unit. */
  gsap.utils.toArray('.section h2:not(.h2-split):not(:has(.kt-text))').forEach(el=>{
    const g=gradualSpacingHeading(el);
    if(!g){gsap.from(el,{y:32,opacity:0,duration:1.05,ease:'power4.out',scrollTrigger:{trigger:el,start:'top 86%',fastScrollEnd:true,...rt}});return;}
    ScrollTrigger.create({trigger:el,start:'top 86%',fastScrollEnd:true,...rt,onEnter:()=>g.tween.play()});
  });
  /* sections 01-03 share the .h2-split markup (per-word split spans) but no longer share one
     identical reveal -- capabilities keeps the original vertical mask-wipe; trust (.h2-split-alt)
     gets a scale/tilt-up entrance; testimonials (.h2-split-side) alternates words in from left/
     right instead of straight up. Distinct feel per section instead of the same effect x3. */
  gsap.utils.toArray('.h2-split:not(.h2-split-alt):not(.h2-split-side):not(.h2-split-gradual)').forEach(h=>{
    const words=h.querySelectorAll('.word>span');
    gsap.fromTo(words,{yPercent:110,opacity:0},{yPercent:0,opacity:1,duration:0.7,stagger:0.05,
      ease:'power3.out',scrollTrigger:{trigger:h,start:'top 86%',fastScrollEnd:true,...rt}});
  });
  /* how-it-works heading — GradualSpacingText (Eldora UI): letters assemble in from a slight
     offset, staggered per-char, instead of whole words rising as blocks like every other
     h2-split heading. Plain text now (no .word markup), so splitChars runs directly. */
  gsap.utils.toArray('.h2-split-gradual').forEach(h=>{
    const chars=splitChars(h);
    gsap.fromTo(chars,{opacity:0,x:-10},{opacity:1,x:0,duration:0.5,stagger:0.035,ease:'power2.out',
      scrollTrigger:{trigger:h,start:'top 86%',fastScrollEnd:true,...rt}});
  });
  gsap.utils.toArray('.h2-split-alt').forEach(h=>{
    const words=h.querySelectorAll('.word>span');
    gsap.fromTo(words,{scale:0.6,rotationX:-50,opacity:0,transformOrigin:'50% 100%'},
      {scale:1,rotationX:0,opacity:1,duration:0.65,stagger:0.06,ease:'back.out(1.6)',
        scrollTrigger:{trigger:h,start:'top 86%',fastScrollEnd:true,...rt}});
  });
  gsap.utils.toArray('.h2-split-side').forEach(h=>{
    const words=[...h.querySelectorAll('.word>span')];
    words.forEach((w,i)=>{
      gsap.fromTo(w,{xPercent:i%2?40:-40,opacity:0},{xPercent:0,opacity:1,duration:0.7,delay:i*0.08,
        ease:'power3.out',scrollTrigger:{trigger:h,start:'top 86%',fastScrollEnd:true,...rt}});
    });
  });
  /* kinetic-letter reveal -- reused loading-veil effect (see shared.js/#ktVeil), applied to the
     two headings that had no letter/word treatment (pricing, book). Pure class toggle, CSS
     drives the actual per-letter transition. Plays once and stays, same as everything else above. */
  gsap.utils.toArray('.kt-text').forEach(el=>{
    ScrollTrigger.create({trigger:el,start:'top 86%',once:true,fastScrollEnd:true,
      onEnter:()=>el.classList.add('kt-in')});
  });
  /* .section .sub keeps its plain fade-up + the gradient shine sweep below (background-clip:text
     needs the text to stay a single node -- FadeText's per-word split would break that gradient
     clip across separate inline-block spans, so .sub doesn't get the word-split treatment). */
  gsap.utils.toArray('.section .sub, .lab').forEach(el=>{
    gsap.from(el,{y:30,opacity:0,duration:0.9,ease:'power3.out',
      scrollTrigger:{trigger:el,start:'top 88%',fastScrollEnd:true,...rt}});
  });
  /* same gradient shine sweep as the hero lede (index.html .shine-text/.shine-in), extended to
     every section's own .sub copy line -- reuses the fade-up above (this just layers the shine
     class on top, doesn't replace it), one more animated element per section instead of hand-
     building a new effect per section. */
  gsap.utils.toArray('.section .sub, #about > .wrap > p').forEach(el=>{
    el.classList.add('shine-text');
    ScrollTrigger.create({trigger:el,start:'top 88%',fastScrollEnd:true,once:true,
      onEnter:()=>el.classList.add('shine-in')});
  });
  /* why-me timeline -- connecting line draws in (class toggle, CSS transition drives the actual
     scaleX/scaleY so it works for both the horizontal desktop layout and vertical mobile one
     without duplicating JS per breakpoint), dots+copy stagger up same as the nume-style reveal
     above but scoped so each item lands in sequence instead of all at once. */
  gsap.utils.toArray('.why-timeline').forEach(tl=>{
    const items=tl.querySelectorAll('.why-item');
    ScrollTrigger.create({trigger:tl,start:'top 85%',fastScrollEnd:true,once:true,
      onEnter:()=>tl.classList.add('why-in')});
    gsap.fromTo(items,{opacity:0,y:22,filter:'blur(6px)'},{
      opacity:1,y:0,filter:'blur(0px)',duration:.8,stagger:.12,ease:'power2.out',
      scrollTrigger:{trigger:tl,start:'top 85%',fastScrollEnd:true,once:true}
    });
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
  /* pricing tiers — staggered "cards rising off a stacked deck" cascade (inspired by a
     3D-stack pack reference), but 2D-only: translate/scale/opacity, no rotate3d/perspective.
     That combo already bit capabilities once this session (forced a compositing layer per
     card right at the Lenis scroll-handoff point, read as lag) — same risk here, not worth it
     for a pricing-card entrance. Single shared trigger + per-card delay gives the cascade
     timing instead of each card's own independent threshold-cross. */
  gsap.utils.toArray('.tier-slot').forEach((slot,i)=>{
    /* trust-badge sits outside .tier (so it doesn't stretch the card's flex height) but must
       animate WITH its card — otherwise it sits fully visible/static while the card is still
       fading/scaling in underneath it, reading as a floating, disconnected element mid-scroll. */
    const targets=[slot.querySelector('.tier'),slot.querySelector('.trust-badge')].filter(Boolean);
    gsap.fromTo(targets,{y:46-i*6,scale:0.92,opacity:0},
      {y:0,scale:1,opacity:1,duration:0.85,delay:i*0.12,ease:'power3.out',
        scrollTrigger:{trigger:'.tiers',start:'top 88%',fastScrollEnd:true,...rt}});
  });
  /* book/closing (05) — copy and calendar converge from opposite sides */
  gsap.fromTo('.book-grid>div:first-child',{opacity:0,x:-40},
    {opacity:1,x:0,duration:0.9,ease:'power3.out',scrollTrigger:{trigger:'.book-grid',start:'top 85%',fastScrollEnd:true,...rt}});
  gsap.fromTo('.book-grid>div:last-child',{opacity:0,x:40},
    {opacity:1,x:0,duration:0.9,ease:'power3.out',scrollTrigger:{trigger:'.book-grid',start:'top 85%',fastScrollEnd:true,...rt}});
  /* hero content drifts up on scroll — desktop only. scrub:true recalculates every scroll tick,
     right at the hero->01 handoff — the exact spot users felt lag on mobile. */
  if(isDesktop){
    gsap.to('.h-wrap',{yPercent:-8,ease:'none',scrollTrigger:{trigger:'#top',start:'top top',end:'bottom top',scrub:true}});
  }
  /* icon/number "pop" — layered ON TOP of the once:true reveals above, doesn't touch them.
     Replays every time you scroll back into view, either direction — but uses restart-only
     toggleActions ('restart none none restart'), NOT the default reverse-on-leaveBack that's
     documented above (~line 672) as the actual cause of the old flicker bug: reverse un-plays
     the instant you wobble backward past the trigger; restart only re-fires once you've fully
     left and come back, so a bit of scroll bounce near the threshold can't retrigger it mid-air. */
  gsap.utils.toArray('.hiw-num, .trust-card .ti').forEach(el=>{
    gsap.fromTo(el,{scale:0.4,rotation:-25,opacity:0},{scale:1,rotation:0,opacity:1,duration:.6,ease:'back.out(1.8)',
      scrollTrigger:{trigger:el,start:'top 88%',fastScrollEnd:true,toggleActions:'restart none none restart'}});
  });
}

/* pause hero sheen when scrolled past — kills off-screen repaint cost */
(function(){const hero=document.getElementById('top');if(!hero)return;
  onVisibilityChange(hero,visible=>document.documentElement.classList.toggle('hero-off',!visible));})();
/* pause the Premium card's spinning gradient border off-screen — was running unconditionally forever */
(function(){const prem=document.querySelector('.tier.prem');if(!prem)return;
  onVisibilityChange(prem,visible=>prem.classList.toggle('spin-off',!visible));})();
/* same pause-off-screen treatment for the Launch card's spinning border */
(function(){const launch=document.querySelector('.tier.launch');if(!launch)return;
  onVisibilityChange(launch,visible=>launch.classList.toggle('spin-off',!visible));})();

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
  });
}

/* hidden-cost 3D domino chain — scroll-linked: each slab is sharp + active at screen centre,
   blurs as it drifts off-centre, and flips backward once scrolled past. Cost flickers live. */
(function(){
  const rail=document.getElementById('drail');if(!rail)return;
  const ds=[...rail.querySelectorAll('.domino')];
  /* gate both the scroll-driven layout read below and this ticker on section visibility —
     neither had a skip before, so both ran sitewide, forever, on every scroll frame /
     every 260ms regardless of whether this section was anywhere near the viewport. */
  let railVisible=true;
  onVisibilityChange(rail,v=>{railVisible=v;});
  const el=document.getElementById('dcost');
  if(el){
    const oddRand=()=>2*Math.floor(Math.random()*1000)+1001; // 1001..2999 odd
    setInterval(()=>{if(railVisible)el.textContent=oddRand().toLocaleString('en-US');},260);
  }
  if(reduce){ds.forEach(d=>d.classList.add('active'));return;}
  let pending=false, ih=window.innerHeight;
  const mob=window.matchMedia('(max-width:900px)').matches;
  /* filter:blur() forces a repaint of every slab it touches, every scroll frame -- the single
     priciest per-frame style write in this whole file. Capping it low (3px) still paid that cost
     every frame; killing it outright on mobile (rotate+opacity only, both GPU-composited, no
     repaint) removes it as a jank source instead of just shrinking it. */
  const MAXBLUR=mob?0:7;
  const prev=new Map();                // last written values per slab, so we skip redundant style writes
  function upd(){
    const railR=rail.getBoundingClientRect();
    if(railR.bottom<-120||railR.top>ih+120)return; // section off-screen — do nothing
    const vc=ih/2;
    ds.forEach(d=>{
      const r=d.getBoundingClientRect();
      const dd=((r.top+r.height/2)-vc)/ih;           // <0 above centre (past), >0 below (incoming)
      const ab=Math.abs(dd);
      // quantize so we only touch the DOM when a value actually changes (kills mobile repaint churn)
      const blur=Math.round(Math.min(ab*13,MAXBLUR)*2)/2;                 // .5px steps
      const rot=Math.round(Math.max(-16,Math.min(90,-dd*185)));          // 1deg steps
      const op=Math.round((1-Math.min(ab*1.15,0.6))*20)/20;             // .05 steps
      const p=prev.get(d);
      if(!p||p.b!==blur||p.r!==rot||p.o!==op){
        d.style.filter=blur?('blur('+blur+'px)'):'none';
        d.style.transform='rotateX('+rot+'deg)';
        d.style.opacity=op;
        prev.set(d,{b:blur,r:rot,o:op});
      }
      d.classList.toggle('active',ab<0.16);
    });
  }
  const onScroll=()=>{if(pending||!railVisible)return;pending=true;requestAnimationFrame(()=>{pending=false;upd();});};
  window.addEventListener('scroll',onScroll,{passive:true});
  /* mobile Safari fires 'resize' (height-only) as the address bar collapses/expands mid-scroll --
     same false trigger documented and guarded elsewhere in this file (see onWidthResize above),
     missed here. Recomputing every domino's getBoundingClientRect() on that false signal is what
     read as the page stalling/glitching right when scroll resumed. */
  onWidthResize(()=>{ih=window.innerHeight;onScroll();});
  if(lenis&&lenis.on)lenis.on('scroll',onScroll);
  upd();
})();

/* testimonials carousel -- auto-advances every 4.5s, loops back to the start at the end. Prev/
   next and auto-advance share one step() so they can't fight; any manual interaction (arrow
   click, drag/touch, hover) resets the auto timer instead of racing it. Reduced-motion gets
   arrows only, no auto-advance -- a carousel that moves itself every few seconds is exactly the
   kind of motion that preference exists to opt out of. */
(function(){
  const track=document.getElementById('testiGrid');
  const prev=document.querySelector('.testi-prev'),next=document.querySelector('.testi-next');
  if(!track||!prev||!next)return;
  function cardStep(){
    const card=track.querySelector('.testi-card');
    return (card?card.getBoundingClientRect().width:320)+20;
  }
  function atEnd(){return track.scrollLeft+track.clientWidth>=track.scrollWidth-4;}
  function step(dir){
    if(dir>0&&atEnd()){track.scrollTo({left:0,behavior:reduce?'auto':'smooth'});return;}
    track.scrollBy({left:dir*cardStep(),behavior:reduce?'auto':'smooth'});
  }
  let timer=null;
  function stop(){if(timer){clearInterval(timer);timer=null;}}
  function start(){
    if(reduce||timer)return;
    timer=setInterval(()=>step(1),3000);
  }
  function reset(){stop();start();}
  prev.addEventListener('click',()=>{step(-1);reset();});
  next.addEventListener('click',()=>{step(1);reset();});
  track.addEventListener('pointerdown',stop);
  track.addEventListener('mouseenter',stop);
  track.addEventListener('mouseleave',start);
  document.addEventListener('visibilitychange',()=>{document.hidden?stop():start();});
  start();
})();

/* pricing copy column -- explicitly static, no scroll-tracking. Went through several rounds of
   sticky/pin behavior here (CSS position:sticky, GSAP pin+pinSpacing variants, function-based
   start/end, refreshPriority fixes for a real cross-trigger recalculation-order bug) chasing "don't
   let it disappear while scrolling the tiers" -- final call: keep it simple and just leave it in
   its normal position at the top of .price-copy ("keep flexible prices fixed in the slot at the
   top, don't let it move"). No JS needed for that -- .price-copy-inner{position:relative} (CSS)
   already renders it at the top of the column and leaves it there; this file simply doesn't touch
   it anymore. */

/* pricing mode toggle: Monthly / Own outright */
(function(){
  const mt=document.getElementById('modeToggle');if(!mt)return;
  const tiers=document.getElementById('tiers');
  mt.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    const mode=b.dataset.mode;
    mt.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    tiers.classList.toggle('mode-own',mode==='own');
    if(!reduce){
      const sel=mode==='own'?'.po':'.pm';
      gsap.fromTo(tiers.querySelectorAll(sel+' .price'),{opacity:0,y:-24},{opacity:1,y:0,duration:1.5,ease:'power2.out',overwrite:true});
    }
    ScrollTrigger.refresh();
  });
})();

/* pricing currency combobox: USD/ZAR/EUR/GBP/AUD/CAD/NGN/KES/AED/INR — independent of Monthly/Own-outright toggle above */
(function(){
  const dd=document.getElementById('currDD');if(!dd)return;
  const btn=document.getElementById('currBtn');
  const panel=document.getElementById('currPanel');
  const list=document.getElementById('currList');
  const more=document.getElementById('currMore');
  const btnSym=document.getElementById('currBtnSym');
  const btnCode=document.getElementById('currBtnCode');
  const tiers=document.getElementById('tiers');
  const items=[...list.querySelectorAll('.curr-dd-item')];
  const ALL=['zar','eur','gbp','aud','cad','ngn','kes','aed','inr','brl','mxn','jpy','cny','sgd','chf','sek','nok','dkk','nzd'];

  /* bouncing chevron tells an average visitor the 20-currency list scrolls -- fades once they reach the bottom */
  function updateMore(){
    const atBottom=list.scrollTop+list.clientHeight>=list.scrollHeight-4;
    more.classList.toggle('hide',atBottom);
  }
  list.addEventListener('scroll',updateMore,{passive:true});

  function closeList(){
    dd.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
    panel.hidden=true;
  }
  function openList(){
    dd.classList.add('open');
    btn.setAttribute('aria-expanded','true');
    panel.hidden=false;
    list.scrollTop=0;
    updateMore();
    if(!reduce)gsap.fromTo(panel,{opacity:0,y:-8},{opacity:1,y:0,duration:0.22,ease:'power2.out'});
  }
  function select(item){
    const curr=item.dataset.curr;
    btnSym.textContent=item.dataset.sym;
    btnCode.textContent=item.dataset.curr.toUpperCase();
    items.forEach(i=>{i.classList.toggle('on',i===item);i.setAttribute('aria-selected',i===item?'true':'false');});
    ALL.forEach(c=>tiers.classList.toggle('curr-'+c,curr===c));
    if(!reduce){
      const prices=tiers.querySelectorAll(curr==='usd'?'.cur-usd':'.cur-'+curr);
      gsap.fromTo(prices,{opacity:0,y:-24},{opacity:1,y:0,duration:1.5,ease:'power2.out',overwrite:true});
    }
    ScrollTrigger.refresh();
    closeList();
  }
  btn.addEventListener('click',e=>{
    e.stopPropagation();
    dd.classList.contains('open')?closeList():openList();
  });
  items.forEach(item=>item.addEventListener('click',()=>select(item)));
  document.addEventListener('click',e=>{if(!dd.contains(e.target))closeList();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeList();});
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

/* cross-page anchor landings (e.g. /book-a-call -> /#capabilities) -- the inline head script
   cancelled the browser's native instant jump-to-fragment; replay it here as a smooth scroll
   once layout/Lenis have settled. Double rAF: one for this frame's layout, one to let Lenis's
   own init (just above) register before it's asked to scroll. */
if(location.hash){
  const target=document.querySelector(location.hash);
  if(target){
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(reduce){target.scrollIntoView();return;}
      if(lenis){lenis.scrollTo(target,{duration:1.2});}else{target.scrollIntoView({behavior:'smooth'});}
    }));
  }
}

/* Cal.com discovery embed (live booking) */
(function(C,A,L){let p=function(a,ar){a.q.push(ar);};let d=C.document;C.Cal=C.Cal||function(){let cal=C.Cal;let ar=arguments;if(!cal.loaded){cal.ns={};cal.q=cal.q||[];d.head.appendChild(d.createElement("script")).src=A;cal.loaded=true;}if(ar[0]===L){const api=function(){p(api,arguments);};const namespace=ar[1];api.q=api.q||[];if(typeof namespace==="string"){cal.ns[namespace]=cal.ns[namespace]||api;p(cal.ns[namespace],ar);p(cal,["initNamespace",namespace]);}else p(cal,ar);return;}p(cal,ar);};})(window,"https://app.cal.com/embed/embed.js","init");
function initCal(){
  try{
    Cal("init","discovery",{origin:"https://app.cal.com"});
    Cal.ns.discovery("inline",{elementOrSelector:"#cal-embed",calLink:"mvssolves/discovery",layout:"month_view",config:{theme:"light"}});
    Cal.ns.discovery("ui",{theme:"light",cssVarsPerTheme:{light:{"cal-brand":"#00eeff","cal-text":"#0a0a0a","cal-text-emphasis":"#0a0a0a","cal-bg":"#ffffff","cal-bg-emphasis":"#f6f5f3","cal-bg-muted":"#efeee9","cal-border":"rgba(10,10,10,0.18)","cal-border-emphasis":"rgba(10,10,10,0.30)","cal-border-subtle":"rgba(10,10,10,0.10)"}},hideEventTypeDetails:false,layout:"month_view"});
  }catch(err){document.getElementById('cal-embed').innerHTML='<div style="padding:40px;font-family:JetBrains Mono,monospace;font-size:13px;color:#6a6a72">Booking calendar — <a href="https://cal.com/mvssolves/discovery" style="color:#0a0a0a;text-decoration:underline">open in new tab →</a></div>';}
  (function(){const target=document.getElementById('cal-embed');const skeleton=document.getElementById('calSkeleton');if(!target||!skeleton)return;
    const obs=new MutationObserver(()=>{if(target.querySelector('iframe')){skeleton.style.display='none';obs.disconnect();}});
    obs.observe(target,{childList:true,subtree:true});setTimeout(()=>obs.disconnect(),8000);})();
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

/* hero reveal waits for the kinetic-type veil (shared.js) to finish -- it always dispatches
   mvs:veilDone, whether it played, was skipped, or never existed (reduced-motion), so this never
   hangs waiting for an event that won't fire.
   Also waits for full window 'load' (images/canvases/fonts decoded, layout final) before actually
   calling playHeroReveal -- the veil alone dismisses ~1.1-1.6s after page load, which can land
   BEFORE images/3D canvases finish sizing, especially on a slower connection. Every ScrollTrigger
   created inside playHeroReveal evaluates the CURRENT scroll position the instant it's created --
   if the page layout is still shorter/different than its final size at that moment, a trigger's
   'top 86%' point gets measured wrong, and if that miscalculated point is already behind the
   current scroll position, GSAP fires it immediately instead of waiting for the user to actually
   scroll there. Symptom reported: reveals already "played" by the time you scroll down to them.
   The existing fonts.ready/idle-callback refreshes correct trigger POSITIONS after the fact, but
   can't un-fire a once:true trigger that already played early -- has to not fire early in the
   first place. */
function playHeroRevealWhenReady(){
  if(document.readyState==='complete')playHeroReveal();
  else window.addEventListener('load',playHeroReveal,{once:true});
}
document.addEventListener('mvs:veilDone',playHeroRevealWhenReady,{once:true});

/* RotatingText (react-bits), ported to vanilla JS+GSAP -- no React/motion lib on this site.
   Rotates the whole phrase as one unit rather than the reference's per-character split: the
   .grad gradient (index.html) uses background-clip:text, which only clips a single element's
   OWN direct text -- splitting into per-char inline-block spans would put the actual characters
   in separate boxes and break the gradient across them (the .rot-cur span below is the gradient
   element itself, so it has to keep holding real text directly, not nested child spans). */
(function(){
  if(reduce||typeof gsap==='undefined')return;
  const el=document.getElementById('heroRot');
  if(!el)return;
  const texts=['your business','your bookings','your revenue','your growth'];
  let i=0;
  setInterval(()=>{
    gsap.to(el,{yPercent:-120,opacity:0,duration:0.4,ease:'power2.in',onComplete:()=>{
      i=(i+1)%texts.length;
      el.textContent=texts[i];
      gsap.fromTo(el,{yPercent:100,opacity:0},{yPercent:0,opacity:1,duration:0.5,ease:'back.out(1.6)'});
    }});
  },2400);
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
  const gfx=mobileGfxOpts();
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:gfx.antialias});
  renderer.setPixelRatio(gfx.dpr);
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

  /* sideways scroll-pan: track how far this section has scrolled through the viewport and
     slide the whole network across x for it, rAF-coalesced same as the hero's scroll tracker.
     Also skipped once off-screen — same fix as the hero's tracker, this listener never got
     torn down so it ran a forced layout read on every scroll anywhere on the page, forever. */
  let scrollT=0,sectionVisible=true;
  function updateScroll(){
    const r=section.getBoundingClientRect();
    scrollT=Math.min(Math.max(1-(r.top+r.height*0.5)/(window.innerHeight*0.5+r.height*0.5),0),1);
  }
  let scrollPending=false;
  window.addEventListener('scroll',()=>{
    if(scrollPending||!sectionVisible)return;
    scrollPending=true;
    requestAnimationFrame(()=>{scrollPending=false;updateScroll();});
  },{passive:true});
  updateScroll();

  let running=false,raf=null,t=0;
  function frame(){
    if(!running)return;
    raf=requestAnimationFrame(frame);
    if(!halfRate(scene))return;   // ambient — 30fps
    t+=0.02;
    group.rotation.y+=0.0024;
    group.rotation.x=Math.sin(t*0.2)*0.08;
    group.position.x=(scrollT-0.5)*6.5;
    nodeMat.opacity=0.35+scrollImpulse*0.4;
    lineMat.opacity=0.1+scrollImpulse*0.25;
    renderer.render(scene,camera);
  }
  function start(){if(running)return;running=true;raf=requestAnimationFrame(frame);}
  function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=null;}

  onVisibilityChange(section,visible=>{sectionVisible=visible;visible?start():stop();});
  document.addEventListener('visibilitychange',()=>{document.hidden?stop():(section.getBoundingClientRect().bottom>0&&start());});

  section.classList.add('has-3d');
  start();
}
/* hidden-cost backdrop — concentric rings expanding outward on a loop, "cost compounding the
   longer you wait" motif. Distinct shape language from every other section (rings, not
   network/terrain/knot/polyhedron). Kept faint behind the domino chain in front. */
function initCostLeak3D(canvas){
  if(!canvas||reduce||typeof THREE==='undefined')return;
  let gl;
  try{gl=canvas.getContext('webgl2')||canvas.getContext('webgl');}catch(e){}
  if(!gl)return;

  const section=canvas.closest('#hidden-cost');
  const gfx=mobileGfxOpts();
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:gfx.antialias});
  renderer.setPixelRatio(gfx.dpr);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,1,0.1,50);
  camera.position.set(0,0,7);

  /* leaking particles — "cost draining away the longer you wait", swapped in after the
     expanding-rings version didn't land well. Falling points instead of a rotating solid,
     distinct from every other section on the page. */
  const N=200;
  const pos=new Float32Array(N*3);
  const speed=new Float32Array(N);
  const phase=new Float32Array(N);
  for(let i=0;i<N;i++){
    pos[i*3]=(Math.random()-0.5)*11;
    pos[i*3+1]=(Math.random()-0.5)*9;
    pos[i*3+2]=(Math.random()-0.5)*4;
    speed[i]=0.006+Math.random()*0.014;
    phase[i]=Math.random()*Math.PI*2;
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const mat=new THREE.PointsMaterial({color:0xffffff,size:0.05,transparent:true,opacity:0.32,sizeAttenuation:true,blending:THREE.AdditiveBlending,depthWrite:false});
  const points=new THREE.Points(geo,mat);
  scene.add(points);

  let w=0,h=0;
  function size(){
    const r=section.getBoundingClientRect();
    w=r.width;h=r.height;
    renderer.setSize(w,h,false);
    camera.aspect=w/Math.max(h,1);
    camera.updateProjectionMatrix();
    camera.position.z=w<700?9:7;
  }
  onWidthResize(size);
  size();

  const posArr=geo.attributes.position.array;
  let running=false,raf=null,t=0;
  function frame(){
    if(!running)return;
    raf=requestAnimationFrame(frame);
    if(!halfRate(scene))return;   // ambient — 30fps
    t+=0.02;
    const fall=(1+scrollImpulse*3)*2;
    for(let i=0;i<N;i++){
      posArr[i*3+1]-=speed[i]*fall;
      posArr[i*3]+=Math.sin(t+phase[i])*0.003;
      if(posArr[i*3+1]<-4.5)posArr[i*3+1]=4.5;
    }
    geo.attributes.position.needsUpdate=true;
    mat.opacity=0.32+scrollImpulse*0.35;
    renderer.render(scene,camera);
  }
  function start(){if(running)return;running=true;raf=requestAnimationFrame(frame);}
  function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=null;}

  onVisibilityChange(section,visible=>{visible?start():stop();});
  document.addEventListener('visibilitychange',()=>{document.hidden?stop():(section.getBoundingClientRect().bottom>0&&start());});

  section.classList.add('has-3d');
  start();
}
/* pricing backdrop — same drifting-particle language as hidden-cost's leak (that one landed
   well), but inverted: particles rise instead of fall ("value building up" vs "cost draining
   away"), sparser and slower so it reads as a distinct, calmer counterpart, not a repeat. */
function initPriceRise3D(canvas){
  if(!canvas||reduce||typeof THREE==='undefined')return;
  let gl;
  try{gl=canvas.getContext('webgl2')||canvas.getContext('webgl');}catch(e){}
  if(!gl)return;

  const section=canvas.closest('#pricing');
  const gfx=mobileGfxOpts();
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:gfx.antialias});
  renderer.setPixelRatio(gfx.dpr);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,1,0.1,50);
  camera.position.set(0,0,7);

  const N=140;
  const pos=new Float32Array(N*3);
  const speed=new Float32Array(N);
  const phase=new Float32Array(N);
  for(let i=0;i<N;i++){
    pos[i*3]=(Math.random()-0.5)*11;
    pos[i*3+1]=(Math.random()-0.5)*9;
    pos[i*3+2]=(Math.random()-0.5)*4;
    speed[i]=0.004+Math.random()*0.008;
    phase[i]=Math.random()*Math.PI*2;
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const mat=new THREE.PointsMaterial({color:0xffffff,size:0.045,transparent:true,opacity:0.26,sizeAttenuation:true,blending:THREE.AdditiveBlending,depthWrite:false});
  const points=new THREE.Points(geo,mat);
  scene.add(points);

  let w=0,h=0;
  function size(){
    const r=section.getBoundingClientRect();
    w=r.width;h=r.height;
    renderer.setSize(w,h,false);
    camera.aspect=w/Math.max(h,1);
    camera.updateProjectionMatrix();
    camera.position.z=w<700?9:7;
  }
  onWidthResize(size);
  size();

  const posArr=geo.attributes.position.array;
  let running=false,raf=null,t=0;
  function frame(){
    if(!running)return;
    raf=requestAnimationFrame(frame);
    if(!halfRate(scene))return;   // ambient — 30fps
    t+=0.02;
    /* falls same direction as hidden-cost's leak now, not rising — was the inverse on
       purpose, changed on request to move the same way on scroll. */
    const fall=(1+scrollImpulse*3)*2;
    for(let i=0;i<N;i++){
      posArr[i*3+1]-=speed[i]*fall;
      posArr[i*3]+=Math.sin(t+phase[i])*0.0024;
      if(posArr[i*3+1]<-4.5)posArr[i*3+1]=4.5;
    }
    geo.attributes.position.needsUpdate=true;
    mat.opacity=0.26+scrollImpulse*0.3;
    renderer.render(scene,camera);
  }
  function start(){if(running)return;running=true;raf=requestAnimationFrame(frame);}
  function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=null;}

  onVisibilityChange(section,visible=>{visible?start():stop();});
  document.addEventListener('visibilitychange',()=>{document.hidden?stop():(section.getBoundingClientRect().bottom>0&&start());});

  section.classList.add('has-3d');
  start();
}
/* floating 3D "MVS" wordmark scrapped — replaced by the scroll paint-wipe (see paint IIFE below).
   Not initialising it: the hero keeps its animated contour-line field (which was hidden only while
   has-3d was set) as a calm static backdrop, and the paint sweep is the hero's scroll moment now. */
/* every per-section 3D backdrop is retired — the whole site now shares ONE background canvas
   (#bgfx, the sparkle field below) as requested, so the sections are transparent and this single
   drifting field shows through all of them. Cheaper (one canvas, not six) and unified. */
// initHero3D(document.getElementById('hero3d'));
// initCapGrid3D(document.getElementById('cap3d'));
// initBookPoly3D(document.getElementById('book3d'));
// initIntegNodes3D(document.getElementById('integ3d'));
// initPriceRise3D(document.getElementById('price3d'));
// initCostLeak3D(document.getElementById('cost3d'));

/* the global background canvas (#bgfx) lives in shared.js now (loaded on every page, not just
   this one) -- was duplicated inline per-page before, this is the single copy. */

/* CardSwap (React Bits component, ported to vanilla JS+GSAP -- no React/build step on this site).
   Replaces the old scroll-pin fold-stack for the 3 service cards: instead of pinning to scroll
   position, the front card drops away and cycles to the back of the stack on a timer, the next
   card promoting to front. Same makeSlot/placeNow/swap recipe as the source component; the drop
   distance and slot offsets are scaled up from its 500px/60px/70px defaults to suit these large
   content cards instead of the small fixed-size cards the original demo targets. Runs on every
   viewport -- unlike the scroll-pin version, nothing here depends on scroll position, so there's
   no separate mobile pin-jank class of bug to worry about. */
(function(){
  if(reduce||typeof gsap==='undefined')return;
  const container=document.getElementById('featStack');
  const cards=[...document.querySelectorAll('#featStack .feat-card')];
  if(!container||cards.length<2)return;

  /* cards carry different amounts of copy (card 2 has an extra .feat-claim line) -- equalize to
     the tallest card's own natural height first, same "measure real content" rule the old
     fold-stack used, so the stack container's height (set below) matches what's actually on screen. */
  cards.forEach(c=>{c.style.height='';});
  const cardH=Math.max(...cards.map(c=>c.getBoundingClientRect().height));
  cards.forEach(c=>{c.style.height=cardH+'px';});
  container.style.height=(cardH+70)+'px'; /* + slack for the vertical stack offset below (2 layers * verticalDistance) */
  /* #capabilities has overflow:hidden (CSS) -- the drop distance can't exceed the real clear space
     below the stack or the card gets hard-clipped mid-animation instead of smoothly leaving view.
     Measuring the actual gap (not guessing a fixed px value) so this stays safe on any viewport;
     20px safety margin, floor of 60px so the drop still reads as real motion even if the section
     is snug. */
  const cap=document.getElementById('capabilities');
  const clearBelow=cap?cap.getBoundingClientRect().bottom-container.getBoundingClientRect().bottom:9999;
  /* no lower floor here on purpose -- a floor that ignores clearBelow (e.g. min 60px) can still
     exceed the real safe space on a tight mobile viewport (measured: 76px clear, a 60px floor
     left only 16px margin instead of the intended 20px). Clamping to whatever's actually safe,
     even if that's small, beats a hard clip. */
  const dropDist=Math.max(0,Math.min(cardH*0.5,clearBelow-20));

  /* real 3D instead of the flat skewY hack: skewY shears a rectangle into a parallelogram, which
     never actually reads as "3D" -- it's a 2D distortion. rotationX (tilts the card back into the
     screen, foreshortening it against the container's perspective) plus rotationZ (in-plane fan
     tilt, like a hand of cards) is what a real card actually does. zStep pushes each layer back
     further so the perspective has real depth to work with, scaleStep shrinks with distance. */
  const verticalDistance=22,zStep=90,scaleStep=0.055,fanTilt=-7,fanStep=-5,tiltBackStep=10;
  const config={ease:'sine.inOut',durDrop:0.6,durMove:0.55,durReturn:0.5,promoteOverlap:0.3,returnDelay:0.15}; /* less overlap than before (0.8 -> 0.3) so the drop and the promote-forward motion read as two distinct visible beats instead of blurring into one simultaneous blob */

  const makeSlot=(i,total)=>({y:-i*verticalDistance,z:-i*zStep,scale:1-i*scaleStep,
    rotationZ:fanTilt+i*fanStep,rotationX:-i*tiltBackStep,zIndex:total-i});
  const placeNow=(el,slot)=>gsap.set(el,{x:0,y:slot.y,z:slot.z,scale:slot.scale,xPercent:0,yPercent:-50,
    rotationZ:slot.rotationZ,rotationX:slot.rotationX,transformOrigin:'center center',
    zIndex:slot.zIndex,opacity:1,force3D:true});

  const total=cards.length;
  let order=cards.map((_,i)=>i);
  cards.forEach((c,i)=>placeNow(c,makeSlot(i,total)));

  function swap(){
    if(order.length<2)return;
    const [front,...rest]=order;
    const elFront=cards[front];
    const tl=gsap.timeline();
    tl.to(elFront,{y:'+='+dropDist,rotationZ:'-=6',opacity:0,duration:config.durDrop,ease:config.ease});
    tl.addLabel('promote','-='+(config.durDrop*config.promoteOverlap));
    rest.forEach((idx,i)=>{
      const el=cards[idx],slot=makeSlot(i,total);
      tl.set(el,{zIndex:slot.zIndex},'promote');
      tl.to(el,{y:slot.y,z:slot.z,scale:slot.scale,rotationZ:slot.rotationZ,rotationX:slot.rotationX,
        duration:config.durMove,ease:config.ease},'promote+='+(i*0.12));
    });
    const backSlot=makeSlot(total-1,total);
    tl.addLabel('return','promote+='+(config.durMove*config.returnDelay));
    tl.set(elFront,{y:backSlot.y-dropDist,z:backSlot.z,scale:backSlot.scale,
      rotationZ:backSlot.rotationZ,rotationX:backSlot.rotationX,zIndex:backSlot.zIndex},'return');
    tl.to(elFront,{y:backSlot.y,opacity:1,duration:config.durReturn,ease:config.ease},'return');
    tl.call(()=>{order=[...rest,front];});
  }

  setInterval(swap,4200); /* bumped alongside the longer, less-overlapped swap animation so there's a clear resting beat between cycles instead of the next swap firing mid-motion */
  onWidthResize(()=>{
    cards.forEach(c=>{c.style.height='';});
    const h=Math.max(...cards.map(c=>c.getBoundingClientRect().height));
    cards.forEach(c=>{c.style.height=h+'px';});
    container.style.height=(h+70)+'px';
  });
})();
