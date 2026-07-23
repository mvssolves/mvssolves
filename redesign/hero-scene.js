/* HERO SCENE -- live WebGL, not a video file.

   26k points that travel through SIX recognisable forms, each one standing for something the
   agency actually does, and detonate into a turbulent noise storm between every one:

       website wireframe  ->  automation flow  ->  system layers
             ->  growth chart  ->  global reach  ->  conversion funnel

   The turbulence drives the colour, so the acid green only appears at the moment of maximum
   chaos and the violet returns as each form resolves. Order -> chaos -> order, six times a loop.

   ACCURACY is the whole game here. Points are distributed EVENLY ALONG REAL LINE SEGMENTS
   (walking a segment list by arc length), not scattered into a volume. Random scattering is why
   generic particle heroes read as fog -- even arc-length sampling is what makes a rectangle look
   like a rectangle and a funnel look like a funnel.

   Two position attributes (aFrom/aTo) rather than one per form: the CPU swaps the buffers at each
   transition, which is an O(n) copy every ~7s. Six separate attributes would cost six times the
   VRAM permanently to save a copy that happens twice a minute.

   Other notes:
   - noise runs in GLSL, so turbulence costs nothing on the main thread
   - the canvas buffer is sized to the VIEWPORT, never to #hero3d, whose height animates every
     scroll frame; resizing a WebGL context mid-scroll is what made an early version glitch. A
     CSS transform scales it in step with the host instead, at zero per-frame cost.
   - stops rendering entirely when off-screen or on a hidden tab
   - no-ops under prefers-reduced-motion */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

const host = document.getElementById('hero3d');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (host && !reduce) init(host);

function init(host) {
  const COUNT = 26000;
  const HOLD = 4.2;      // seconds a form stays readable
  const MORPH = 2.6;     // seconds of detonation + reassembly between forms

  /* ---- segment helpers ------------------------------------------------------------------- */
  const S = [];                                   // scratch segment list, reused per form
  const seg = (a, b) => S.push([a, b]);
  const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);

  function rect(w, h, z = 0, cx = 0, cy = 0) {
    const x = w / 2, y = h / 2;
    seg(v(cx - x, cy - y, z), v(cx + x, cy - y, z));
    seg(v(cx + x, cy - y, z), v(cx + x, cy + y, z));
    seg(v(cx + x, cy + y, z), v(cx - x, cy + y, z));
    seg(v(cx - x, cy + y, z), v(cx - x, cy - y, z));
  }
  function circle(r, steps, axis, off = 0, cx = 0, cy = 0, cz = 0) {
    let prev = null;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const c = Math.cos(a) * r, s = Math.sin(a) * r;
      const p = axis === 'xy' ? v(cx + c, cy + s, cz + off)
              : axis === 'xz' ? v(cx + c, cy + off, cz + s)
              :                 v(cx + off, cy + c, cz + s);
      if (prev) seg(prev, p);
      prev = p;
    }
  }

  /* Even arc-length sampling: walk the total length of the segment list and drop a point every
     (total/COUNT). This is what gives the forms their edge definition. */
  function bake(jitter = 0.018) {
    const lens = S.map(([a, b]) => a.distanceTo(b));
    const total = lens.reduce((x, y) => x + y, 0);
    const out = new Float32Array(COUNT * 3);
    let si = 0, walked = 0;
    for (let i = 0; i < COUNT; i++) {
      const d = (i / COUNT) * total;
      while (si < S.length - 1 && walked + lens[si] < d) { walked += lens[si]; si++; }
      const t = lens[si] > 0 ? (d - walked) / lens[si] : 0;
      const [a, b] = S[si];
      out[i * 3]     = a.x + (b.x - a.x) * t + (Math.random() - 0.5) * jitter;
      out[i * 3 + 1] = a.y + (b.y - a.y) * t + (Math.random() - 0.5) * jitter;
      out[i * 3 + 2] = a.z + (b.z - a.z) * t + (Math.random() - 0.5) * jitter;
    }
    S.length = 0;
    return out;
  }

  /* ---- the six forms --------------------------------------------------------------------- */

  /* 1. WEBSITE -- a browser window: chrome bar, traffic-light dots, hero block, two columns */
  function formSite() {
    rect(5.0, 3.4);
    seg(v(-2.5, 0.85), v(2.5, 0.85));                    // chrome bar underline
    [-2.2, -2.0, -1.8].forEach(x => circle(0.07, 12, 'xy', 0, x, 1.28));
    rect(4.2, 1.0, 0.02, 0, 0.15);                       // hero block
    rect(1.9, 0.9, 0.02, -1.15, -1.0);                   // column left
    rect(1.9, 0.9, 0.02, 1.15, -1.0);                    // column right
    return bake();
  }

  /* 2. AUTOMATION FLOW -- nodes wired together, the shape of a pipeline */
  function formFlow() {
    const n = [v(-2.6, 0.9), v(-0.9, 1.5), v(-0.9, -0.3), v(0.9, 0.9),
               v(0.9, -1.4), v(2.6, 0.2), v(2.6, -1.9)];
    n.forEach(p => circle(0.26, 18, 'xy', 0, p.x, p.y));
    [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5], [4, 6]]
      .forEach(([a, b]) => seg(n[a], n[b]));
    return bake();
  }

  /* 3. SYSTEM LAYERS -- stacked slabs, offset in depth */
  function formLayers() {
    for (let i = 0; i < 4; i++) {
      const y = 1.35 - i * 0.9, z = -i * 0.45, w = 4.4 - i * 0.5;
      rect(w, 0.55, z, 0, y);
      seg(v(-w / 2, y - 0.275, z), v(-w / 2 + 0.35, y - 0.275, z - 0.35));   // depth cue
      seg(v(w / 2, y - 0.275, z), v(w / 2 - 0.35, y - 0.275, z - 0.35));
    }
    return bake();
  }

  /* 4. GROWTH -- axes, rising bars, trend line */
  function formChart() {
    seg(v(-2.6, -1.8), v(2.6, -1.8));                    // x axis
    seg(v(-2.6, -1.8), v(-2.6, 1.9));                    // y axis
    const h = [0.7, 1.2, 1.7, 2.4, 3.2];
    h.forEach((height, i) => {
      const x = -1.9 + i * 0.95;
      rect(0.6, height, 0, x, -1.8 + height / 2);
    });
    let prev = null;
    h.forEach((height, i) => {
      const p = v(-1.9 + i * 0.95, -1.8 + height + 0.28, 0.15);
      if (prev) seg(prev, p);
      prev = p;
    });
    return bake();
  }

  /* 5. REACH -- a wireframe globe */
  function formGlobe() {
    const R = 2.3;
    for (let i = 1; i < 6; i++) {                        // latitudes
      const y = -R + (i / 6) * 2 * R;
      circle(Math.sqrt(Math.max(R * R - y * y, 0)), 40, 'xz', y);
    }
    for (let i = 0; i < 6; i++) {                        // longitudes
      let prev = null;
      for (let j = 0; j <= 40; j++) {
        const a = (j / 40) * Math.PI * 2, lon = (i / 6) * Math.PI;
        const p = v(R * Math.sin(a) * Math.cos(lon), R * Math.cos(a), R * Math.sin(a) * Math.sin(lon));
        if (prev) seg(prev, p);
        prev = p;
      }
    }
    return bake();
  }

  /* 6. FUNNEL -- leads narrowing to conversion */
  function formFunnel() {
    const top = 2.6, bot = 0.55, hi = 1.9, lo = -1.9;
    seg(v(-top, hi), v(top, hi));
    seg(v(-bot, lo), v(bot, lo));
    seg(v(-top, hi), v(-bot, lo));
    seg(v(top, hi), v(bot, lo));
    for (let i = 1; i < 4; i++) {                        // stage dividers
      const t = i / 4, w = top + (bot - top) * t, y = hi + (lo - hi) * t;
      seg(v(-w, y), v(w, y));
    }
    circle(0.3, 20, 'xy', 0, 0, lo - 0.75);              // the converted drop
    return bake();
  }

  const forms = [formSite(), formFlow(), formLayers(), formChart(), formGlobe(), formFunnel()];
  const seed = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) seed[i] = Math.random();

  /* ---- renderer -------------------------------------------------------------------------- */
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  Object.assign(renderer.domElement.style, {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)', display: 'block'
  });

  host.appendChild(renderer.domElement);
  host.classList.add('has-scene');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 8.6);

  const geo = new THREE.BufferGeometry();
  const aFrom = new THREE.BufferAttribute(forms[0].slice(), 3);
  const aTo = new THREE.BufferAttribute(forms[1].slice(), 3);
  geo.setAttribute('position', new THREE.BufferAttribute(forms[0].slice(), 3)); // three requires it
  geo.setAttribute('aFrom', aFrom);
  geo.setAttribute('aTo', aTo);
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  const NOISE = `
    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g;
      vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(
        i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.0*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
      vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y);
      vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
      return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }`;

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uMix: { value: 0 },
      uTurb: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 13.0 * Math.min(window.devicePixelRatio, 2) },
      uViolet: { value: new THREE.Color('#9070DF') },
      uLime: { value: new THREE.Color('#E6F536') },
      uPull: { value: 0 },
      uPullPos: { value: new THREE.Vector3(0, -3.2, 0) },
      uCalm: { value: 0 }
    },
    vertexShader: NOISE + `
      attribute vec3 aFrom;
      attribute vec3 aTo;
      attribute float aSeed;
      uniform float uMix, uTurb, uTime, uSize, uPull, uCalm;
      uniform vec3 uPullPos;
      varying float vEnergy, vFade, vSeed, vSharp;

      void main(){
        /* per-point lag so the form assembles as a wave, not all at once */
        float m = clamp((uMix - aSeed * 0.3) / 0.7, 0.0, 1.0);
        m = m * m * (3.0 - 2.0 * m);
        vec3 p = mix(aFrom, aTo, m);

        p *= 1.0 + uCalm * 0.3;

        float sc = 0.42, ts = uTime * 0.28;
        vec3 flow = vec3(
          snoise(p * sc + vec3(0.0, ts, 0.0)),
          snoise(p * sc + vec3(ts, 0.0, 5.2)),
          snoise(p * sc + vec3(3.1, 1.7, ts))
        );
        float amp = uTurb * (0.55 + aSeed * 0.9);
        p += flow * (amp * 2.2);

        /* ---- AMBIENT MOTION -- always on, so the form is never a static picture -------------
           Three layered movements, each small enough to preserve the shape's readability:
           1. a pulse wave travelling left-to-right across the form, pushing points in z
           2. a slow breathing scale
           3. per-point micro-orbit, phase-offset by seed so the surface shimmers rather than
              every point moving in lockstep
           Kept independent of uTurb so the form still reads clearly while it's being held. */
        float wave = sin(p.x * 1.15 - uTime * 1.25) * 0.5 + sin(p.y * 0.9 + uTime * 0.85) * 0.5;
        p.z += wave * 0.13;
        p *= 1.0 + sin(uTime * 0.55) * 0.022;
        float ph = aSeed * 6.2831 + uTime * 1.6;
        p += vec3(cos(ph), sin(ph), cos(ph * 0.7)) * 0.035;
        /* the drifting noise stays too, at low amplitude, so the motion never looks mechanical */
        p += flow * 0.075;

        vec3 toCta = uPullPos - p;
        float grab = uPull * (1.0 - smoothstep(0.0, 5.5, length(toCta)));
        p += normalize(toCta + 0.0001) * grab * 2.0;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.55 + aSeed * 0.7) * (1.0 / -mv.z);

        /* the travelling wave tints the crest slightly green, so the motion is visible in colour
           as well as position -- otherwise the ambient movement reads only as vague drift */
        vEnergy = clamp(amp * 1.15 + length(flow) * 0.1 + grab * 0.4 + max(wave, 0.0) * 0.12, 0.0, 1.0);
        vFade = smoothstep(15.0, 3.5, -mv.z);
        vSharp = 1.0 - smoothstep(0.4, 3.0, abs(-mv.z - 8.6));
        vSeed = aSeed;
      }`,
    fragmentShader: `
      uniform vec3 uViolet, uLime;
      varying float vEnergy, vFade, vSeed, vSharp;
      void main(){
        vec2 uv = gl_PointCoord - 0.5;
        float d = dot(uv, uv);
        if(d > 0.25) discard;
        float soft = smoothstep(0.25, mix(0.16, 0.0, vSharp), d) * mix(0.45, 1.0, vSharp);
        /* green is EARNED -- it only appears where the cloud is being torn apart */
        float g = smoothstep(0.25, 0.85, vEnergy + vSeed * 0.14);
        vec3 col = mix(uViolet, uLime, g);
        col += g * 0.25;
        gl_FragColor = vec4(col, soft * vFade * 0.82);
      }`
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  /* ---- input ----------------------------------------------------------------------------- */
  const target = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
  let pull = 0, pullTo = 0, idle = 0, lastInput = 0;

  const ndc = new THREE.Vector3();
  function toWorld(cx, cy) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1, 0.5);
    ndc.unproject(camera);
    const dir = ndc.sub(camera.position).normalize();
    return camera.position.clone().add(dir.multiplyScalar(-camera.position.z / dir.z));
  }
  /* pointer drives the parallax tilt only -- repulsion was removed deliberately, it carved a
     circular void that read as a magnifying glass sitting on the artwork */
  window.addEventListener('pointermove', e => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    lastInput = 0;
  }, { passive: true });

  const ctaWorld = new THREE.Vector3(0, -3.2, 0);
  const cta = document.querySelector('.hero-ctas .btn');
  if (cta) {
    cta.addEventListener('pointerenter', () => {
      pullTo = 1; lastInput = 0;
      const r = cta.getBoundingClientRect();
      ctaWorld.copy(toWorld(r.left + r.width / 2, r.top + r.height / 2));
    });
    cta.addEventListener('pointerleave', () => { pullTo = 0; });
  }

  /* ---- sizing ---------------------------------------------------------------------------- */
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px';
    renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fit();
  }
  function fit() {
    const s = Math.min(host.clientWidth / window.innerWidth, host.clientHeight / window.innerHeight);
    renderer.domElement.style.transform = 'translate(-50%,-50%) scale(' + Math.max(s, 0.05).toFixed(4) + ')';
  }
  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
  new ResizeObserver(fit).observe(host);
  resize();

  /* ---- loop ------------------------------------------------------------------------------ */
  let running = true, raf = null, t = 0, cur = 0, phase = 0, morphing = false;
  const clock = new THREE.Clock();
  const scratch = new THREE.Vector3();

  function advance() {
    /* buffer swap at the transition rather than holding all six forms in VRAM permanently */
    cur = (cur + 1) % forms.length;
    aFrom.array.set(forms[cur]);
    aTo.array.set(forms[(cur + 1) % forms.length]);
    aFrom.needsUpdate = aTo.needsUpdate = true;
  }

  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    phase += dt;

    /* hold the form readable, then morph. uMix only moves during the morph window. */
    let e = 0;
    if (phase < HOLD) { e = 0; morphing = false; }
    else {
      const k = Math.min((phase - HOLD) / MORPH, 1);
      e = k * k * (3 - 2 * k);
      morphing = true;
      if (k >= 1) { advance(); phase = 0; e = 0; }
    }
    mat.uniforms.uMix.value = e;

    /* turbulence comes from the shape transition ONLY. Scroll velocity and click detonation were
       removed deliberately: both fought the form's own motion, so the hero never settled into a
       readable state on its own terms. */
    mat.uniforms.uTurb.value = Math.sin(e * Math.PI) * 0.95;
    mat.uniforms.uTime.value = t;

    lastInput += dt;
    idle += ((lastInput > 6 ? 1 : 0) - idle) * 0.03;
    mat.uniforms.uCalm.value = idle;

    pull += (pullTo - pull) * 0.10;
    mat.uniforms.uPull.value = pull;

    eased.x += (target.x - eased.x) * 0.045;
    eased.y += (target.y - eased.y) * 0.045;
    /* forms are front-facing by design, so the idle spin is gentle -- a fast rotation would
       destroy the readability the arc-length sampling exists to create */
    points.rotation.y = Math.sin(t * 0.16) * 0.28 + eased.x * 0.38;
    points.rotation.x = Math.sin(t * 0.11) * 0.10 + eased.y * 0.22;

    points.updateMatrixWorld();
    mat.uniforms.uPullPos.value.copy(points.worldToLocal(scratch.copy(ctaWorld)));

    renderer.render(scene, camera);
  }
  function start() { if (!running) { running = true; clock.getDelta(); frame(); } }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? start() : stop()),
    { threshold: 0 }).observe(host);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

  frame();
}
