/* FORGED -- the hero sculpture.
   Replaces the 26k-point six-form morph (hero-scene.js, kept on disk but no longer loaded).

   Four machined rings on fixed axes, each turning at its own rate, around a flare-coloured core.
   Deliberately engineered rather than organic: a smooth chrome knot lands on the metal-blob
   direction that was already rejected, so this reads as an instrument instead.

   Nothing here resizes with the scroll. #hero3d stays full-bleed for its whole life and the recede
   is purely a clip-path crop (see the hero scrub in index.html). The sculpture is sized once, to
   the settled card, so the recede reads as the frame closing around a fixed object.
*/
/* both specifiers go through the import map in index.html: everything under three's examples/jsm
   imports the bare 'three', so resolving core the same way guarantees one module instance. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host = document.getElementById('hero3d');

if (host) boot();

function boot() {
  const FLARE = 0xE4622F;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  /* ADAPTIVE RESOLUTION. Start at the quality ceiling and only give it up if the machine cannot
     hold the frame -- a fixed cap either wastes a fast GPU or stutters on a slow one. The ladder
     is measured, not guessed: frame times are averaged over a second and the ratio steps down a
     rung whenever the average is worse than ~18ms (roughly 55fps). It never steps back up, so it
     cannot oscillate between two rungs and pulse. */
  /* ceiling lowered from 2 to 1.5: on a 2x/3x display this scene is rendering every frame for the
     entire scrub (nearly the whole first screen of scroll, on every device -- this is the one 3D
     piece that stays on mobile too), so the DPR ceiling is a continuous fill-rate cost, not a
     one-time one. 1.5 still reads sharp; it's ~44% fewer pixels than 2x from the very first frame,
     rather than waiting a full second of bad frames for the ladder below to step down. */
  const DPR_LADDER = [Math.min(devicePixelRatio, 1.5), 1.3, 1.1, 1.0];
  let dprStep = 0;
  renderer.setPixelRatio(DPR_LADDER[dprStep]);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  /* no transform set here on purpose -- the canvas transform is owned by CSS so the scrub can
     drive it through --sc / --ty. An inline transform would win over the stylesheet and freeze it. */
  Object.assign(renderer.domElement.style, {
    position: 'absolute', top: '50%', left: '50%', display: 'block'
  });
  host.appendChild(renderer.domElement);
  host.classList.add('has-scene');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 11.4);

  /* RoomEnvironment rather than an HDR file: a real studio reflection with no network asset, which
     is the difference between metal that reads as material and metal that reads as flat shading. */
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(FLARE, 3.4);
  key.position.set(-4.5, 3.2, 3.4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xFFFFFF, 1.5);
  fill.position.set(4.2, -1.6, 2.6);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xFFFFFF, 0.35));

  /* ---- the sculpture ---------------------------------------------------------------------- */
  const rig = new THREE.Group();
  scene.add(rig);

  const steel = new THREE.MeshStandardMaterial({ color: 0xE4DED3, metalness: 1, roughness: 0.15 });
  const dark  = new THREE.MeshStandardMaterial({ color: 0x2A2419, metalness: 1, roughness: 0.32 });

  const RINGS = [
    { r: 2.72, t: 0.075, rot: [Math.PI / 2, 0, 0],    spin: [0, 0.24, 0],     mat: steel },
    { r: 2.18, t: 0.115, rot: [Math.PI / 2, 0.62, 0], spin: [0, -0.17, 0.05], mat: steel },
    { r: 1.64, t: 0.135, rot: [1.15, 0, 0.42],        spin: [0.11, 0.3, 0],   mat: dark  },
    { r: 1.12, t: 0.09,  rot: [0.4, 1.1, 0],          spin: [0, 0.42, -0.2],  mat: steel }
  ];
  /* the direction each ring arrives from, so they do not all fly the same line */
  const ARRIVE = [[-1, .45, .2], [1, .35, -.15], [.1, -1, .35], [.7, .8, -.5]]
    .map(v => new THREE.Vector3(...v).normalize());

  const rings = RINGS.map((cfg, i) => {
    /* the material is CLONED per ring. steel is shared by three of them, so fading one during the
       intro would fade all three at once. */
    const mat = cfg.mat.clone();
    mat.transparent = true;
    mat.opacity = reduce ? 1 : 0;
    /* 20x132 rather than 28x260: that was 14.5k triangles per ring, 58k across the four, all built
       and uploaded during load. At this size the silhouette is identical and the cost is a quarter. */
    const m = new THREE.Mesh(new THREE.TorusGeometry(cfg.r, cfg.t, 20, 132), mat);
    m.rotation.set(...cfg.rot);
    m.userData.spin = cfg.spin;
    m.userData.base = [...cfg.rot];
    m.userData.dir = ARRIVE[i];
    m.userData.introSpin = 0;
    rig.add(m);
    return m;
  });

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.52, 2),
    new THREE.MeshStandardMaterial({ color: FLARE, metalness: 0.35, roughness: 0.28,
      emissive: FLARE, emissiveIntensity: 0.35, transparent: true, opacity: reduce ? 1 : 0 })
  );
  if (!reduce) core.scale.setScalar(0.0001);
  rig.add(core);

  /* ---- entrance ---------------------------------------------------------------------------- */
  /* the ball lands first, then the rings arrive one at a time, each from its own direction, each
     oversized and spinning as it comes in. Driven off the same clock as the idle motion rather
     than a tween library, so there is one source of time in this file and nothing to keep in sync.
     Skipped wholesale under reduced motion -- the scene simply starts settled. */
  /* introT0 is set only once the scene has actually rendered a few frames -- see the warm-up in the
     loop. Shader compilation, geometry upload and the environment map all land on the first render,
     and starting the animation into that cost is exactly what made the opening stutter. The
     sequence now begins on a warm renderer, and runs slower besides. */
  let introOn = !reduce, introT0 = null, warmFrames = 0, readyFired = false, warmAt = 0;
  const CORE_IN = [0.10, 1.05], RING_IN = 1.20, RING_GAP = 0.26, RING_START = 0.55;
  const INTRO_END = RING_START + RING_GAP * 3 + RING_IN + 0.25;
  const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const backOut = t => { const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  function settle() {
    core.scale.setScalar(1); core.material.opacity = 1;
    rings.forEach(m => { m.material.opacity = 1; m.scale.setScalar(1);
      m.position.set(0, 0, 0); m.userData.introSpin = 0; });
    renderer.toneMappingExposure = 1.05;
  }

  function playIntro(t) {
    core.scale.setScalar(Math.max(0.0001, backOut(seg(t, CORE_IN[0], CORE_IN[1]))));
    core.material.opacity = seg(t, CORE_IN[0], CORE_IN[0] + 0.35);

    rings.forEach((m, i) => {
      const a = RING_START + i * RING_GAP;
      const e = easeOut(seg(t, a, a + RING_IN));
      const k = 1 - e;                       // 1 while off-stage, 0 once landed
      m.material.opacity = e;
      m.scale.setScalar(1 + k * 1.3);        // arrives oversized and closes onto the core
      m.position.copy(m.userData.dir).multiplyScalar(k * 4.4);
      m.userData.introSpin = k * 2.2;        // unwinds into its resting angle
    });

    /* the light settles with the assembly: a brighter exposure at the start reads as the scene
       resolving rather than simply appearing */
    renderer.toneMappingExposure = 1.05 + 0.55 * (1 - easeOut(seg(t, 0, INTRO_END)));

    if (t > INTRO_END) { introOn = false; settle(); }
  }

  const SPAN = 2 * 11.4 * Math.tan(THREE.MathUtils.degToRad(34) / 2);  // world height of the frame

  /* Sized to the VIEWPORT, not to the settled card: at load the sculpture is meant to be big.
     Compacting into the card is handled entirely by the scrub, which drives --sc and --ty on
     #hero3d and is consumed by a CSS transform on this canvas. Nothing here changes with scroll,
     so there is still exactly one thing controlling scale -- it just lives in the timeline now
     instead of in this file. */
  const SCULPT_H = 2 * RINGS[0].r;   // the outer ring is the widest part
  const FILL = 0.82;                 // share of the frame height the sculpture occupies at load

  function place() {
    /* size against the SHORTER axis of the frame. SPAN is the frame's world height, and on a
       landscape screen that is the tighter of the two so it governs -- but a portrait phone is
       only 0.46 as wide as it is tall, giving about 3.2 world units across against a sculpture
       5.7 wide. Sizing to height alone pushed the whole object outside the frame sideways and left
       the hero looking empty. */
    const spanX = SPAN * (innerWidth / innerHeight);
    rig.scale.setScalar((Math.min(SPAN, spanX) * FILL) / SCULPT_H);
    /* pushed right on wide screens so it shares the frame with the bottom-left headline. Centred
       below 1024, where there is no room to sit off-axis.
       camera.lookAt deliberately stays on x=0 -- aiming at the rig would re-centre it in view and
       silently undo this. */
    /* on a phone the sculpture is lifted into the upper part of the frame: the copy sits low on
       the screen there, so centring the object put it behind the headline. */
    const lift = innerWidth <= 760 ? SPAN * 0.26 : 0;
    rig.position.set(innerWidth >= 1024 ? spanX * 0.17 : 0, lift, 0);
  }

  /* ---- sizing ----------------------------------------------------------------------------- */
  /* the canvas is always the full viewport; the clip-path decides how much of it is seen. */
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px';
    renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    place();
  }
  let rt = null;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
  resize();

  /* ---- pointer parallax -------------------------------------------------------------------- */
  let tx = 0, ty = 0, px = 0, py = 0;
  if (!reduce) {
    addEventListener('pointermove', e => {
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  /* ---- loop ------------------------------------------------------------------------------- */
  const clock = new THREE.Clock();
  let running = true, raf = null;
  let fpsAcc = 0, fpsFrames = 0, fpsWindow = 0;

  function frame() {
    raf = requestAnimationFrame(frame);
    const t = clock.getElapsedTime();

    /* measure, then decide once a second */
    const now = performance.now();
    if (fpsWindow === 0) fpsWindow = now;
    fpsFrames++;
    if (now - fpsWindow >= 1000) {
      const avgMs = (now - fpsWindow) / fpsFrames;
      if (avgMs > 18 && dprStep < DPR_LADDER.length - 1) {
        dprStep++;
        renderer.setPixelRatio(DPR_LADDER[dprStep]);
        resize();
      }
      fpsWindow = now; fpsFrames = 0;
    }

    px += (tx - px) * 0.05;
    py += (ty - py) * 0.05;
    camera.position.x = px * 0.85;
    camera.position.y = -py * 0.55;
    camera.lookAt(0, 0, 0);

    /* hold the assembly off-stage until the renderer has drawn a few frames, then start the clock
       from that moment. The first render is where the shaders compile and the geometry uploads;
       animating through that is what was seen as lag at start-up. */
    if (introOn && introT0 === null) {
      if (++warmFrames >= 4) {
        /* warm: shaders are built and the geometry is uploaded. Tell the preloader it can leave. */
        if (!readyFired) { readyFired = true; window.__heroReady = true;
          dispatchEvent(new Event('hero:ready')); }
        /* and hold the assembly until the curtain is actually going up, so the entrance is not
           played out behind a loading screen. __heroGo is false only while a preloader owns it.
           warmAt is the safety: if nothing ever releases us -- preloader script failed, threw, or
           was stripped -- start anyway after 5s rather than leaving an empty hero on screen
           forever. Waiting on another component is fine; depending on it is not. */
        if (warmAt === 0) warmAt = Date.now();
        if (window.__heroGo !== false || Date.now() - warmAt > 5000) introT0 = t;
      }
    } else if (introOn) {
      playIntro(t - introT0);
    }

    rings.forEach(m => {
      const s = m.userData.introSpin;
      m.rotation.x = m.userData.base[0] + m.userData.spin[0] * t;
      m.rotation.y = m.userData.base[1] + m.userData.spin[1] * t + s;
      m.rotation.z = m.userData.base[2] + m.userData.spin[2] * t + s * 0.4;
    });
    core.rotation.y = t * 0.5;
    rig.rotation.y = Math.sin(t * 0.13) * 0.22;

    renderer.render(scene, camera);
  }

  function start() { if (!running) { running = true; clock.getDelta(); frame(); } }
  function stop()  { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  /* compile every material against this camera up front, so the shader build happens here rather
     than on the first animated frame */
  renderer.compile(scene, camera);

  if (reduce) {
    /* one static frame: the sculpture still reads, nothing moves. */
    renderer.render(scene, camera);
  } else {
    new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? start() : stop()),
      { threshold: 0 }).observe(host);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    frame();
  }
}
