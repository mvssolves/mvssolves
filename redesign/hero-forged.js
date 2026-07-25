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
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  Object.assign(renderer.domElement.style, {
    position: 'absolute', top: '50%', left: '50%', display: 'block',
    transformOrigin: '50% 50%'
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
  const rings = RINGS.map(cfg => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(cfg.r, cfg.t, 28, 260), cfg.mat);
    m.rotation.set(...cfg.rot);
    m.userData.spin = cfg.spin;
    m.userData.base = [...cfg.rot];
    rig.add(m);
    return m;
  });

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.52, 3),
    new THREE.MeshStandardMaterial({ color: FLARE, metalness: 0.35, roughness: 0.28,
      emissive: FLARE, emissiveIntensity: 0.35 })
  );
  rig.add(core);

  const SPAN = 2 * 11.4 * Math.tan(THREE.MathUtils.degToRad(34) / 2);  // world height of the frame

  /* The sculpture is framed by the SETTLED CARD and never changes size afterwards. It sits in the
     band above the bottom-anchored copy -- clear of the headline at full bleed, and already
     perfectly framed once the crop closes in. The recede then reads as the frame closing around a
     fixed object rather than the object shrinking, and there is exactly one thing controlling
     scale instead of a canvas transform and a rig scale fighting each other. */
  const TOP_INSET = 88, GAP = 16;
  const SCULPT_H = 2 * RINGS[0].r;   // the outer ring is the widest part

  function place() {
    const copy = document.querySelector('.hero-copy');
    const copyH = copy ? copy.offsetHeight : 0;
    const cardTop = innerWidth <= 760 ? 72 : TOP_INSET;
    const cardBot = innerHeight - (copyH + GAP);
    const bandPx = Math.max(80, cardBot - cardTop);
    const bandWorld = (bandPx / innerHeight) * SPAN;

    rig.position.y = ((innerHeight / 2 - (cardTop + cardBot) / 2) / innerHeight) * SPAN;
    rig.scale.setScalar((bandWorld / SCULPT_H) * 0.96);

    /* pushed off-axis on wide screens so it shares the frame with the headline instead of sitting
       on top of it: sculpture right, copy bottom-left. Centred once there is no room to do that. */
    const spanX = SPAN * (innerWidth / innerHeight);
    rig.position.x = innerWidth >= 1024 ? spanX * 0.19 : 0;
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

  renderer.domElement.style.transform = 'translate(-50%,-50%)';

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

  function frame() {
    raf = requestAnimationFrame(frame);
    const t = clock.getElapsedTime();

    px += (tx - px) * 0.05;
    py += (ty - py) * 0.05;
    camera.position.x = px * 0.85;
    camera.position.y = -py * 0.55;
    /* aims at the frame centre, NOT at the rig: tracking rig.position.x would re-centre the
       sculpture in view and silently undo the off-axis placement. */
    camera.lookAt(0, rig.position.y, 0);

    rings.forEach(m => {
      m.rotation.x = m.userData.base[0] + m.userData.spin[0] * t;
      m.rotation.y = m.userData.base[1] + m.userData.spin[1] * t;
      m.rotation.z = m.userData.base[2] + m.userData.spin[2] * t;
    });
    core.rotation.y = t * 0.5;
    rig.rotation.y = Math.sin(t * 0.13) * 0.22;

    renderer.render(scene, camera);
  }

  function start() { if (!running) { running = true; clock.getDelta(); frame(); } }
  function stop()  { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

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
