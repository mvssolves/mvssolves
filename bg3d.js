/* shared ambient-3D bootstrap for the lightweight subpages (faq, join-the-team, book-a-call) —
   these don't load the homepage's main.js (900+ lines of homepage-specific scroll/GSAP logic),
   just three.js + this file. Mirrors the same proven pattern from the homepage: pause off-screen
   via IntersectionObserver, only resize on a real width change (mobile address-bar guard), and a
   shared scroll-ripple impulse every scene can react to. */
(function(){
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const _vis=new IntersectionObserver(es=>{
    es.forEach(e=>{(e.target.__onVisible||[]).forEach(cb=>cb(e.isIntersecting));});
  },{threshold:0});
  function onVisibilityChange(el,cb){(el.__onVisible=el.__onVisible||[]).push(cb);_vis.observe(el);}

  function onWidthResize(cb){
    let lastW=window.innerWidth;
    window.addEventListener('resize',()=>{
      if(window.innerWidth===lastW)return;
      lastW=window.innerWidth;
      cb();
    },{passive:true});
  }

  let scrollImpulse=0,_lastY=window.scrollY;
  window.addEventListener('scroll',()=>{
    const y=window.scrollY;
    scrollImpulse=Math.min(1,scrollImpulse+Math.abs(y-_lastY)*0.025);
    _lastY=y;
  },{passive:true});
  (function decay(){scrollImpulse*=0.92;requestAnimationFrame(decay);})();

  /* build(ctx) constructs the scene's geometry/material and returns {tick(t,impulse), resize(w,h)}.
     ctx gives {THREE,scene,camera}. Handles renderer/camera/resize/visibility/rAF loop itself so
     each page only supplies the part that makes its shape unique. */
  window.initAmbientScene=function(canvas,build){
    if(!canvas||reduce||typeof THREE==='undefined')return;
    let gl;
    try{gl=canvas.getContext('webgl2')||canvas.getContext('webgl');}catch(e){}
    if(!gl)return;

    const section=canvas.closest('section')||canvas.parentElement;
    const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(45,1,0.1,100);

    const ctx=build({THREE,scene,camera});

    let w=0,h=0;
    function size(){
      const r=section.getBoundingClientRect();
      w=r.width;h=r.height;
      renderer.setSize(w,h,false);
      camera.aspect=w/Math.max(h,1);
      camera.updateProjectionMatrix();
      if(ctx.resize)ctx.resize(w,h);
    }
    onWidthResize(size);
    size();

    let running=false,raf=null,t=0;
    function frame(){
      if(!running)return;
      t+=0.016;
      ctx.tick(t,scrollImpulse);
      renderer.render(scene,camera);
      raf=requestAnimationFrame(frame);
    }
    function start(){if(running)return;running=true;raf=requestAnimationFrame(frame);}
    function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=null;}

    onVisibilityChange(section,visible=>{visible?start():stop();});
    document.addEventListener('visibilitychange',()=>{document.hidden?stop():(section.getBoundingClientRect().bottom>0&&start());});

    section.classList.add('has-3d');
    start();
  };
})();
