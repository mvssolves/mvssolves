/* HERO SCENE — "order from chaos".
 *
 * A few thousand instanced particles cycle between two states: a loose drifting cloud, and a
 * structured lattice. That is the business in one image — clients arrive with scatter, they leave
 * with a system — and it is the one hero idea in this project that means something rather than
 * decorating. (The earlier six-form scene in hero-scene.js is kept but not loaded; it tried to
 * spell out six services and read as noise.)
 *
 * Why instanced particles rather than geometry: every previous WebGL hero here died on
 * performance or on looking like a stock 3D object. One InstancedMesh of low-poly octahedra is a
 * single draw call, holds 60fps on integrated graphics, and reads as bespoke.
 *
 * The CSS collage inside #hero3d stays in the markup and is only faded out once this scene has
 * actually rendered a frame, so no-WebGL, reduced-motion and load failure all fall back to a hero
 * that still looks finished instead of an empty box.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

const host = document.getElementById('hero3d');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (host && !reduceMotion) init(host);

function init(host) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return;                                   // no WebGL — the CSS collage simply stays
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 20);

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearAlpha(0);
  const canvas = renderer.domElement;
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  host.appendChild(canvas);

  /* ---- particles --------------------------------------------------------------------------- */
  const COUNT = 2600;
  const mesh = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.065, 0),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95 }),
    COUNT
  );
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 3), 3);
  /* the headline is anchored to the BOTTOM of the hero, so the field is lifted to sit in the
     upper two-thirds and never collide with it */
  mesh.position.y = 1.9;
  scene.add(mesh);

  const VIOLET = new THREE.Color('#9070DF');
  const LIME   = new THREE.Color('#E6F536');
  const INK    = new THREE.Color('#4b4166');

  const chaos = new Float32Array(COUNT * 3);
  const order = new Float32Array(COUNT * 3);
  const spin  = new Float32Array(COUNT);

  /* COLS*ROWS is chosen to consume the whole COUNT in ONE sheet. An earlier 26x18 grid left ~5
     stacked layers, and the layer offsets read as perspective rays radiating from the centre --
     a starburst, not a system. A single curved sheet reads as structure instantly. */
  const COLS = 65, ROWS = 40;
  for (let i = 0; i < COUNT; i++) {
    chaos[i * 3]     = (Math.random() - 0.5) * 20;
    chaos[i * 3 + 1] = (Math.random() - 0.5) * 11;
    chaos[i * 3 + 2] = (Math.random() - 0.5) * 12;

    /* the ordered state is a gently curved lattice plane — obviously deliberate, obviously built,
       and legible at a glance even at small sizes */
    const c = i % COLS, r = Math.floor(i / COLS);
    const x = (c / (COLS - 1) - 0.5) * 14;
    const y = (r / (ROWS - 1) - 0.5) * 7.6;
    order[i * 3]     = x;
    order[i * 3 + 1] = y;
    /* a shallow swell, just enough to catch the light and prove it's 3D without breaking the
       read of a flat, deliberate grid */
    order[i * 3 + 2] = Math.cos(x * 0.30) * 1.1 + Math.sin(y * 0.34) * 0.7;

    spin[i] = Math.random() * Math.PI * 2;
  }

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  /* ---- cursor parallax (lean, never spin — spinning a hero disorients) ---------------------- */
  let px = 0, py = 0, tx = 0, ty = 0;
  addEventListener('pointermove', e => {
    tx = e.clientX / innerWidth - 0.5;
    ty = e.clientY / innerHeight - 0.5;
  }, { passive: true });

  /* ---- resize: the hero box is scrubbed from 100vh to an inset card, so watch the ELEMENT ---- */
  const resize = () => {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < 700 ? 54 : 38;           // pull back on narrow screens so it never crops
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host);
  resize();

  /* ---- don't burn a GPU on an invisible canvas ---------------------------------------------- */
  let visible = true;
  new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; }), { threshold: 0 })
    .observe(host);

  /* ---- loop: chaos -> assembling -> HELD as a system -> releasing -> chaos -------------------
     The hold is the longest beat on purpose: the resolved state is the one the eye should rest
     on, and it's the one that matches the headline. */
  const CYCLE = 16;
  const ease = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const clock = new THREE.Clock();
  let started = false;

  (function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;

    const t = clock.getElapsedTime();
    const p = (t % CYCLE) / CYCLE;

    let m;
    if (p < 0.30)      m = ease(p / 0.30);                  // assembling
    else if (p < 0.72) m = 1;                               // held
    else if (p < 0.90) m = 1 - ease((p - 0.72) / 0.18);     // releasing
    else               m = 0;                               // drifting

    px += (tx - px) * 0.045;
    py += (ty - py) * 0.045;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      const drift = Math.sin(t * 0.5 + spin[i]) * (1 - m) * 0.6;

      const x = chaos[i3]     + (order[i3]     - chaos[i3])     * m + drift;
      const y = chaos[i3 + 1] + (order[i3 + 1] - chaos[i3 + 1]) * m + drift * 0.7;
      const z = chaos[i3 + 2] + (order[i3 + 2] - chaos[i3 + 2]) * m;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(0.5 + m * 0.6);
      dummy.rotation.set(spin[i] + t * 0.25, spin[i] * 1.7 + t * 0.2, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      /* colour carries the story: muted while scattered, brand violet once ordered, with a lime
         crest sweeping the lattice at full assembly — the system "switching on". */
      const crest = m > 0.9 ? Math.pow(Math.max(0, Math.sin(x * 0.35 - t * 1.6)), 6) : 0;
      col.copy(INK).lerp(VIOLET, m).lerp(LIME, crest * 0.85);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    mesh.rotation.y = px * 0.5;
    mesh.rotation.x = py * 0.32;
    camera.position.x = px * 2.2;
    camera.position.y = -py * 1.4;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    if (!started) { started = true; host.classList.add('scene-live'); }
  })();
}
