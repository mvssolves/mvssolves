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
  const COUNT = 7000;
  const mesh = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.055, 0),
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

  /* ---- targets ------------------------------------------------------------------------------
     The particles don't just tidy up -- they SPELL THE NUMBERS. Each phrase is rasterised to an
     offscreen canvas, the opaque pixels are sampled, and those become particle destinations. So
     the hero literally assembles the proof: 50+ businesses, 10K a month, 100+ websites.

     Sampling a canvas beats hand-authored point lists: the text stays editable, the glyph shapes
     are exact, and one routine handles any phrase. */
  const PHRASES = ['50+', '10K', '100+'];
  const SUBS    = ['businesses', 'a month, each', 'websites built'];

  function sampleText(text, count) {
    const W = 1000, H = 320;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    /* weight/size tuned so the glyphs are solid enough to sample densely at this canvas size */
    g.font = '800 210px Inter, "Helvetica Neue", Arial, sans-serif';
    g.fillText(text, W / 2, H / 2);

    const data = g.getImageData(0, 0, W, H).data;
    const hits = [];
    /* step 2px: plenty of candidates without walking a million pixels */
    for (let y = 0; y < H; y += 2)
      for (let x = 0; x < W; x += 2)
        if (data[(y * W + x) * 4 + 3] > 128) hits.push(x, y);

    const out = new Float32Array(count * 3);
    const n = hits.length / 2;
    for (let i = 0; i < count; i++) {
      /* deterministic stride through the hit list, then a sub-pixel jitter so the sampling grid
         never shows up as visible banding */
      const h = (Math.floor(i * n / count) % n) * 2;
      const jx = (Math.random() - 0.5) * 1.6, jy = (Math.random() - 0.5) * 1.6;
      out[i * 3]     = ((hits[h] + jx) / W - 0.5) * 20;
      out[i * 3 + 1] = -((hits[h + 1] + jy) / H - 0.5) * 6.4;
      out[i * 3 + 2] = (Math.random() - 0.5) * 0.9;   // slight depth so it's a slab, not a decal
    }
    return out;
  }

  const chaos = new Float32Array(COUNT * 3);
  const forms = PHRASES.map(t => sampleText(t, COUNT));
  const spin  = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    chaos[i * 3]     = (Math.random() - 0.5) * 22;
    chaos[i * 3 + 1] = (Math.random() - 0.5) * 12;
    chaos[i * 3 + 2] = (Math.random() - 0.5) * 12;
    spin[i] = Math.random() * Math.PI * 2;
  }

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  /* a caption under the figure names what the number means -- the digits alone are ambiguous */
  const cap = document.createElement('div');
  cap.className = 'hero-cap';
  cap.innerHTML = '<b></b><span></span>';
  host.appendChild(cap);
  const capNum = cap.querySelector('b'), capSub = cap.querySelector('span');

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
  /* one phrase per beat: assemble -> hold -> scatter -> next phrase */
  const BEAT = 7;                              // seconds per phrase
  const ease = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const clock = new THREE.Clock();
  let started = false, shown = -1;

  (function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;

    const t = clock.getElapsedTime();
    const idx = Math.floor(t / BEAT) % forms.length;
    const p = (t % BEAT) / BEAT;
    const target = forms[idx];

    let m;
    if (p < 0.26)      m = ease(p / 0.26);                  // assembling
    else if (p < 0.74) m = 1;                               // held — the readable beat
    else if (p < 0.94) m = 1 - ease((p - 0.74) / 0.20);     // scattering
    else               m = 0;

    if (idx !== shown) {                       // caption follows the figure
      shown = idx;
      capNum.textContent = PHRASES[idx];
      capSub.textContent = SUBS[idx];
    }
    cap.style.opacity = m > 0.55 ? 1 : 0;

    px += (tx - px) * 0.045;
    py += (ty - py) * 0.045;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      const drift = Math.sin(t * 0.5 + spin[i]) * (1 - m) * 0.7;

      const x = chaos[i3]     + (target[i3]     - chaos[i3])     * m + drift;
      const y = chaos[i3 + 1] + (target[i3 + 1] - chaos[i3 + 1]) * m + drift * 0.7;
      const z = chaos[i3 + 2] + (target[i3 + 2] - chaos[i3 + 2]) * m;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(0.42 + m * 0.55);
      dummy.rotation.set(spin[i] + t * 0.25, spin[i] * 1.7 + t * 0.2, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      /* muted while scattered, brand violet once formed, with a lime crest sweeping the glyphs at
         full assembly -- the number "switching on" */
      const crest = m > 0.9 ? Math.pow(Math.max(0, Math.sin(x * 0.4 - t * 1.8)), 6) : 0;
      col.copy(INK).lerp(VIOLET, m).lerp(LIME, crest * 0.9);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    mesh.rotation.y = px * 0.4;
    mesh.rotation.x = py * 0.26;
    camera.position.x = px * 2.2;
    camera.position.y = -py * 1.4;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    if (!started) { started = true; host.classList.add('scene-live'); }
  })();
}
