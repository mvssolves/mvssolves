/* HERO SCENE -- live WebGL, not a video file.
   ~20k points that continuously morph between an ordered lattice and an organic sphere, lit in
   the brand violet/acid-green. Chosen over an AI-generated clip because it renders the palette
   exactly, loops forever with no seam, reacts to the pointer, iterates for free, and ships as a
   few KB of code instead of megabytes of video on the most load-sensitive element of the page.

   Deliberate choices:
   - the morph runs on the GPU (both target positions live in attributes, the shader mixes them)
     rather than looping 20k points in JS every frame
   - renders into #hero3d, whose height is animated on every frame of the scroll. The canvas is
     therefore sized to the VIEWPORT and centred, never to the host, and #hero3d crops it --
     resizing a WebGL context mid-scroll is what made the first version glitch
   - stops rendering entirely when off-screen or on a hidden tab -- same convention as every
     other continuous effect on the live site
   - no-ops under prefers-reduced-motion, leaving the CSS placeholder visible */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

const host = document.getElementById('hero3d');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (host && !reduce) init(host);

function init(host) {
  const COUNT = 20000;
  const VIOLET = new THREE.Color('#9070DF');
  const LIME = new THREE.Color('#E6F536');

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  /* The canvas is sized to the VIEWPORT and centred, not stretched to the host.
     #hero3d's height is animated on every frame of the scroll, so sizing the canvas to it meant
     reallocating the drawing buffer and rebuilding the projection matrix dozens of times a
     second mid-scroll -- that was the glitching. At a fixed viewport size nothing reallocates
     while scrolling; the host simply crops it (it has overflow:hidden), and because the scene is
     centred the subject stays framed as the crop tightens. */
  Object.assign(renderer.domElement.style, {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)', display: 'block'
  });
  host.appendChild(renderer.domElement);
  host.classList.add('has-scene');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 8.4);

  /* ---- targets ------------------------------------------------------------------------- */
  const posA = new Float32Array(COUNT * 3);   // ordered lattice
  const posB = new Float32Array(COUNT * 3);   // organic sphere
  const rnd = new Float32Array(COUNT);
  const tint = new Float32Array(COUNT);

  const SIDE = Math.ceil(Math.cbrt(COUNT));   // lattice edge resolution
  const GAP = 4.6 / SIDE;
  for (let i = 0; i < COUNT; i++) {
    /* lattice: a clean cube grid, jittered a touch so it reads as built rather than printed */
    const ix = i % SIDE, iy = Math.floor(i / SIDE) % SIDE, iz = Math.floor(i / (SIDE * SIDE));
    posA[i * 3] = (ix - SIDE / 2) * GAP + (Math.random() - 0.5) * GAP * 0.25;
    posA[i * 3 + 1] = (iy - SIDE / 2) * GAP + (Math.random() - 0.5) * GAP * 0.25;
    posA[i * 3 + 2] = (iz - SIDE / 2) * GAP + (Math.random() - 0.5) * GAP * 0.25;

    /* sphere: fibonacci distribution -- even coverage, no polar clumping */
    const t = i / COUNT;
    const phi = Math.acos(1 - 2 * t);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 2.5 + Math.random() * 0.22;
    posB[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    posB[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    posB[i * 3 + 2] = r * Math.cos(phi);

    rnd[i] = Math.random();
    tint[i] = Math.random();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posA.slice(), 3)); // required by three
  geo.setAttribute('aPosA', new THREE.BufferAttribute(posA, 3));
  geo.setAttribute('aPosB', new THREE.BufferAttribute(posB, 3));
  geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
  geo.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uMix: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 13.0 * Math.min(window.devicePixelRatio, 2) },
      uViolet: { value: new THREE.Vector3(VIOLET.r, VIOLET.g, VIOLET.b) },
      uLime: { value: new THREE.Vector3(LIME.r, LIME.g, LIME.b) }
    },
    vertexShader: `
      attribute vec3 aPosA;
      attribute vec3 aPosB;
      attribute float aRnd;
      attribute float aTint;
      uniform float uMix;
      uniform float uTime;
      uniform float uSize;
      varying float vTint;
      varying float vFade;
      void main(){
        /* per-point offset on the morph so the shape assembles in a wave rather than all at once */
        float local = clamp((uMix - aRnd * 0.35) / 0.65, 0.0, 1.0);
        local = local * local * (3.0 - 2.0 * local);           /* smoothstep */
        vec3 p = mix(aPosA, aPosB, local);

        /* constant slow drift so it never looks frozen at either end of the morph */
        float d = uTime * 0.35 + aRnd * 6.2831;
        p += vec3(sin(d), cos(d * 0.9), sin(d * 0.7)) * 0.055;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (1.0 / -mv.z);
        vTint = aTint;
        vFade = smoothstep(14.0, 4.0, -mv.z);                  /* depth falloff = atmosphere */
      }
    `,
    fragmentShader: `
      uniform vec3 uViolet;
      uniform vec3 uLime;
      varying float vTint;
      varying float vFade;
      void main(){
        vec2 uv = gl_PointCoord - 0.5;
        float d = dot(uv, uv);
        if(d > 0.25) discard;                                  /* round points, not squares */
        float soft = smoothstep(0.25, 0.0, d);
        /* mostly violet with a lime minority -- the green reads as accent, not a second base */
        vec3 col = mix(uViolet, uLime, smoothstep(0.72, 1.0, vTint));
        gl_FragColor = vec4(col, soft * vFade * 0.85);
      }
    `
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  /* ---- pointer parallax ---------------------------------------------------------------- */
  const target = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  window.addEventListener('pointermove', e => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  /* ---- size ----------------------------------------------------------------------------- */
  /* keyed to the VIEWPORT, never to the host. Deliberately not a ResizeObserver on #hero3d: that
     fires on every frame of the scroll shrink and resizing a WebGL context mid-scroll is what
     made it glitch. The viewport only changes on a real window resize. */
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px';
    renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  let rt = null;
  window.addEventListener('resize', () => {
    clearTimeout(rt);                 /* debounced: a drag-resize shouldn't reallocate per frame */
    rt = setTimeout(resize, 120);
  });
  resize();

  /* ---- loop ------------------------------------------------------------------------------ */
  let running = true, raf = null, t = 0;
  const clock = new THREE.Clock();

  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    /* own accumulator with a clamped delta rather than clock.getElapsedTime(): the clock keeps
       running while the scene is paused off-screen, so elapsed time would leap forward and the
       morph would snap to a new position on resume. Clamping also absorbs the long first frame
       after a hidden tab. */
    t += Math.min(clock.getDelta(), 0.05);

    /* hold at each shape before travelling to the other: a raw sine never rests, so the ordered
       lattice never actually reads as ordered. This dwells ~3s at each end of a ~16s cycle. */
    const cycle = (t % 16) / 16;
    const wave = 0.5 - 0.5 * Math.cos(cycle * Math.PI * 2);
    mat.uniforms.uMix.value = Math.min(1, Math.max(0, (wave - 0.18) / 0.64));
    mat.uniforms.uTime.value = t;

    eased.x += (target.x - eased.x) * 0.04;
    eased.y += (target.y - eased.y) * 0.04;
    points.rotation.y = t * 0.06 + eased.x * 0.35;
    points.rotation.x = eased.y * 0.22;

    renderer.render(scene, camera);
  }
  function start() { if (!running) { running = true; clock.getDelta(); frame(); } }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  /* stop when scrolled away or the tab is hidden -- 20k points shouldn't keep drawing off-screen */
  new IntersectionObserver(es => { es.forEach(e => e.isIntersecting ? start() : stop()); },
    { threshold: 0 }).observe(host);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

  frame();
}
