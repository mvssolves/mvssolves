/* HERO SCENE -- live WebGL, not a video file.

   ~26k points that travel between three forms -- a torus knot, a sphere, and a double helix --
   and, crucially, do not simply cross-fade between them: each transition detonates the cloud
   into a turbulent curl-noise storm and then reassembles it into the next shape. The violence of
   that turbulence is what drives the colour, so the acid green only appears at the moment of
   maximum chaos and the violet returns as order resolves. Order -> chaos -> order, on a loop.

   Chosen over an AI-generated clip because it renders the palette exactly, loops with no seam,
   reacts to the pointer, iterates for free, and ships as a few KB rather than megabytes of video
   on the most load-sensitive element of the page.

   Performance / correctness notes:
   - all three target shapes live in attributes and the blend happens in the vertex shader; the
     CPU only updates three float uniforms per frame, never a 26k-point loop
   - noise is evaluated in GLSL, so the turbulence costs nothing on the main thread
   - the canvas buffer is sized to the VIEWPORT, never to #hero3d. That element's height is
     animated on every frame of the scroll, and resizing a WebGL context mid-scroll is what made
     the first version glitch. A CSS transform scales the canvas in step with the host instead,
     so the scene shrinks rather than being cropped, at zero per-frame cost.
   - stops rendering entirely when off-screen or on a hidden tab
   - no-ops under prefers-reduced-motion, leaving the CSS placeholder visible */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

const host = document.getElementById('hero3d');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (host && !reduce) init(host);

function init(host) {
  const COUNT = 26000;
  const CYCLE = 7.5;            // seconds per shape (incl. its transition)

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

  /* ---- the three forms ------------------------------------------------------------------- */
  const p0 = new Float32Array(COUNT * 3);   // torus knot
  const p1 = new Float32Array(COUNT * 3);   // sphere
  const p2 = new Float32Array(COUNT * 3);   // double helix
  const seed = new Float32Array(COUNT);

  const rand = (a, b) => a + Math.random() * (b - a);

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;

    /* (2,3) torus knot, with points scattered in a tube around the curve so it reads as a solid
       form rather than a wire */
    const t = (i / COUNT) * Math.PI * 2;
    const kr = 2 + Math.cos(3 * t);
    const tubeA = rand(0, Math.PI * 2), tubeR = rand(0, 0.42);
    p0[i3]     = kr * Math.cos(2 * t) * 0.82 + Math.cos(tubeA) * tubeR;
    p0[i3 + 1] = kr * Math.sin(2 * t) * 0.82 + Math.sin(tubeA) * tubeR;
    p0[i3 + 2] = Math.sin(3 * t) * 0.95 + Math.cos(tubeA * 1.7) * tubeR;

    /* fibonacci sphere -- even coverage, no polar clumping */
    const ft = i / COUNT;
    const phi = Math.acos(1 - 2 * ft);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const sr = 2.55 + rand(-0.12, 0.12);
    p1[i3]     = sr * Math.sin(phi) * Math.cos(theta);
    p1[i3 + 1] = sr * Math.sin(phi) * Math.sin(theta);
    p1[i3 + 2] = sr * Math.cos(phi);

    /* double helix -- two counter-offset strands with a light scatter around each */
    const ht = i / COUNT;
    const hAng = ht * Math.PI * 7 + (i % 2 ? Math.PI : 0);
    const hRad = 1.55 + rand(-0.16, 0.16);
    p2[i3]     = Math.cos(hAng) * hRad;
    p2[i3 + 1] = (ht - 0.5) * 5.6 + rand(-0.04, 0.04);
    p2[i3 + 2] = Math.sin(hAng) * hRad;

    seed[i] = Math.random();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(p0.slice(), 3)); // three requires it
  geo.setAttribute('aP0', new THREE.BufferAttribute(p0, 3));
  geo.setAttribute('aP1', new THREE.BufferAttribute(p1, 3));
  geo.setAttribute('aP2', new THREE.BufferAttribute(p2, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  /* Ashima 3D simplex noise -- the standard implementation, used here to drive the turbulence
     that tears each shape apart between forms. */
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
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uW: { value: new THREE.Vector3(1, 0, 0) },  // blend weights across the three forms
      uTurb: { value: 0 },                        // 0 = settled, 1 = fully detonated
      uTime: { value: 0 },
      uSize: { value: 15.0 * Math.min(window.devicePixelRatio, 2) },
      uViolet: { value: new THREE.Color('#9070DF') },
      uLime: { value: new THREE.Color('#E6F536') },
      uPull: { value: 0 },                                  // CTA magnetism strength
      uPullPos: { value: new THREE.Vector3(0, -3.2, 0) },    // roughly where the CTA sits
      uCalm: { value: 0 }                                   // 1 = idle, cloud expands and settles
    },
    vertexShader: NOISE + `
      attribute vec3 aP0;
      attribute vec3 aP1;
      attribute vec3 aP2;
      attribute float aSeed;
      uniform vec3 uW;
      uniform float uTurb;
      uniform float uTime;
      uniform float uSize;
      uniform float uPull;
      uniform vec3 uPullPos;
      uniform float uCalm;
      varying float vEnergy;
      varying float vFade;
      varying float vSeed;
      varying float vSharp;

      void main(){
        vec3 p = aP0 * uW.x + aP1 * uW.y + aP2 * uW.z;

        /* idle: the whole cloud breathes outward and settles when nothing has been touched */
        p *= 1.0 + uCalm * 0.42;

        /* curl-ish turbulence: three offset noise samples give a divergence-free-looking flow,
           far cheaper than a real curl and visually indistinguishable at this density */
        float sc = 0.42;
        float ts = uTime * 0.28;
        vec3 flow = vec3(
          snoise(p * sc + vec3(0.0, ts, 0.0)),
          snoise(p * sc + vec3(ts, 0.0, 5.2)),
          snoise(p * sc + vec3(3.1, 1.7, ts))
        );

        /* per-point lag so the cloud tears apart in a wave rather than uniformly */
        float lag = 0.55 + aSeed * 0.9;
        float amp = uTurb * lag;

        /* a constant whisper of drift so the settled shapes still breathe */
        p += flow * (amp * 2.35 + 0.075);

        /* CTA MAGNETISM -- on CTA hover the nearest points lean toward it */
        vec3 toCta = uPullPos - p;
        float dC = length(toCta);
        float grab = uPull * (1.0 - smoothstep(0.0, 5.5, dC));
        p += normalize(toCta + 0.0001) * grab * 2.0;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.55 + aSeed * 0.75) * (1.0 / -mv.z);

        vEnergy = clamp(amp * 1.15 + length(flow) * 0.12 + grab * 0.4, 0.0, 1.0);
        vFade = smoothstep(15.0, 3.5, -mv.z);
        /* fake depth of field: points near the focal plane stay tight, distant ones bloom soft.
           Cheaper and safer than a post-processing pass, which fights additive blending. */
        vSharp = 1.0 - smoothstep(0.4, 3.0, abs(-mv.z - 8.6));
        vSeed = aSeed;
      }
    `,
    fragmentShader: `
      uniform vec3 uViolet;
      uniform vec3 uLime;
      varying float vEnergy;
      varying float vFade;
      varying float vSeed;
      varying float vSharp;
      void main(){
        vec2 uv = gl_PointCoord - 0.5;
        float d = dot(uv, uv);
        if(d > 0.25) discard;                       /* round points, not squares */
        /* depth of field: in-focus points have a hard falloff, out-of-focus ones smear into a
           soft disc and dim, so the cloud gains real depth instead of reading as a flat sheet */
        float soft = smoothstep(0.25, mix(0.16, 0.0, vSharp), d) * mix(0.45, 1.0, vSharp);

        /* the green is EARNED: it only shows where the cloud is being torn apart, so the palette
           tracks the story instead of being sprinkled at random */
        float g = smoothstep(0.25, 0.85, vEnergy + vSeed * 0.14);
        vec3 col = mix(uViolet, uLime, g);
        col += g * 0.25;                            /* hot cores at peak chaos */

        gl_FragColor = vec4(col, soft * vFade * 0.8);
      }
    `
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  /* ---- input: parallax, repulsion, magnetism, detonation, idle --------------------------- */
  const target = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
  let pull = 0, pullTo = 0;          // CTA magnetism, eased
  let burst = 0;                     // click detonation, decays
  let idle = 0, lastInput = 0;       // seconds since any interaction

  /* world-space cursor: unproject the pointer onto the z=0 plane so repulsion happens where the
     user actually sees their cursor, not at some arbitrary depth */
  const ndc = new THREE.Vector3();
  function toWorld(cx, cy) {
    /* map against the CANVAS's own visual box, not the host. The canvas is viewport-sized and
       CSS-scaled/centred inside the host, so the two rects differ -- using the host put the
       repulsion centre somewhere other than under the actual cursor. getBoundingClientRect
       reports the post-transform box, which is exactly what's needed here. */
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1, 0.5);
    ndc.unproject(camera);
    const dir = ndc.sub(camera.position).normalize();
    return camera.position.clone().add(dir.multiplyScalar(-camera.position.z / dir.z));
  }

  /* pointer drives the parallax tilt only. Cursor repulsion was removed deliberately: pushing
     points away from the pointer carves a circular void that reads as a magnifying-glass
     artefact sitting on top of the artwork, rather than as the cloud reacting to you. */
  window.addEventListener('pointermove', e => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    lastInput = 0;
  }, { passive: true });

  /* click anywhere on the scene forces an early explosion -- rewards poking at it */
  host.addEventListener('pointerdown', () => { burst = 1; lastInput = 0; });

  /* CTA magnetism: the nearest points lean toward the button while it's hovered */
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

  /* SCROLL VELOCITY -> turbulence. Measured off scrollY per frame rather than a scroll event so
     it decays smoothly to zero instead of sticking at the last event's value. */
  let lastScroll = window.scrollY, scrollVel = 0;

  /* ---- sizing -- viewport-keyed buffer, transform-scaled to the host ---------------------- */
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px';
    renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fit();
  }
  /* scale, not crop: the buffer stays put and CSS shrinks it in step with #hero3d. `contain` fit
     so the whole scene stays visible; the margin is invisible since host and section share a bg */
  function fit() {
    const s = Math.min(host.clientWidth / window.innerWidth,
                       host.clientHeight / window.innerHeight);
    renderer.domElement.style.transform =
      'translate(-50%,-50%) scale(' + Math.max(s, 0.05).toFixed(4) + ')';
  }
  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
  new ResizeObserver(fit).observe(host);   /* cheap: sets a transform, never reallocates */
  resize();

  /* ---- loop ------------------------------------------------------------------------------- */
  let running = true, raf = null, t = 0;
  const clock = new THREE.Clock();
  const w = new THREE.Vector3();
  const scratchB = new THREE.Vector3();

  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    /* own accumulator with a clamped delta: THREE.Clock keeps running while paused off-screen,
       so elapsed time would leap and the animation would snap on resume. Captured once -- a
       second getDelta() call in the same frame returns ~0. */
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;

    /* phase 0..3 across the three forms; `f` is progress within the current transition */
    const phase = (t / CYCLE) % 3;
    const idx = Math.floor(phase);
    let f = phase - idx;

    /* dwell: hold each form for the first 45% of its slot, then travel. Without the hold the
       shapes never actually resolve and it reads as permanent soup. */
    const travel = Math.max(0, (f - 0.45) / 0.55);
    const e = travel * travel * (3 - 2 * travel);          // smoothstep

    w.set(0, 0, 0);
    w.setComponent(idx, 1 - e);
    w.setComponent((idx + 1) % 3, e);
    mat.uniforms.uW.value.copy(w);

    /* --- ONE turbulence budget ---------------------------------------------------------------
       Three sources feed it: the shape transition, scroll velocity, and click detonation. They
       are summed and then hard-capped, because three independent sources each free to reach full
       strength just produces noise -- the cloud reads as broken rather than reactive. */
    const sy = window.scrollY;
    /* per-frame delta rather than a scroll event: this decays smoothly to zero on its own
       instead of sticking at whatever the last event reported */
    scrollVel += (Math.min(Math.abs(sy - lastScroll) / 34, 1) - scrollVel) * 0.22;
    lastScroll = sy;
    burst *= 0.94;                                              // detonation decays

    const transition = Math.sin(e * Math.PI) * 0.92;
    mat.uniforms.uTurb.value = Math.min(1.15, transition + scrollVel * 0.95 + burst * 1.1);
    mat.uniforms.uTime.value = t;

    /* idle: after ~14s untouched the cloud expands and calms */
    lastInput += dt;
    idle += (( lastInput > 6 ? 1 : 0 ) - idle) * 0.03;
    mat.uniforms.uCalm.value = idle;

    pull += (pullTo - pull) * 0.10;
    mat.uniforms.uPull.value = pull;

    eased.x += (target.x - eased.x) * 0.045;
    eased.y += (target.y - eased.y) * 0.045;
    points.rotation.y = t * 0.075 + eased.x * 0.4;
    points.rotation.x = eased.y * 0.25;

    /* the shader positions points in OBJECT space, but the cursor and CTA are captured in world
       space -- and this object is rotating. Convert after the rotation is applied, or repulsion
       lands somewhere other than under the actual cursor. */
    points.updateMatrixWorld();
    /* scratch vectors reused rather than cloned -- this runs 60-120x a second, and two fresh
       Vector3 allocations per frame is needless GC pressure on the hero */
    mat.uniforms.uPullPos.value.copy(points.worldToLocal(scratchB.copy(ctaWorld)));

    renderer.render(scene, camera);
  }
  function start() { if (!running) { running = true; clock.getDelta(); frame(); } }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? start() : stop()),
    { threshold: 0 }).observe(host);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

  frame();
}
