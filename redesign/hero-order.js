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

  /* hide the CSS fallback the INSTANT WebGL is confirmed. Waiting for the first rendered frame
     meant the collage was visible for a beat on load, which read as a glitch. */
  host.classList.add('scene-booting');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 26);   // pulled back so the sculpture sits inside the frame

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearAlpha(0);
  const canvas = renderer.domElement;
  /* centred, not top-left anchored: the host shrinks to an inset card as the hero scrubs, and a
     top-left anchored buffer would crop to the corner instead of staying on the subject. */
  canvas.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);'
    + 'width:100vw;height:100vh;display:block;';
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
  mesh.position.y = 1.5;
  scene.add(mesh);

  const VIOLET = new THREE.Color('#9070DF');
  const LIME   = new THREE.Color('#E6F536');
  const INK    = new THREE.Color('#4b4166');
  const BG     = new THREE.Color('#efecf7');   // the hero's own background, for depth fade

  /* ---- forms ---------------------------------------------------------------------------------
     Abstract sculpture, not typography. Four mathematical bodies the cloud resolves into, each
     built from parametric surfaces so the points land on real structure rather than being
     scattered into a silhouette -- that even distribution is the whole difference between a form
     that reads as designed and one that reads as fog.

        torus knot   a single continuous path, endlessly looping
        helix        two strands winding together
        wave         a rippling sheet
        sphere       a hollow shell, evenly quantised (fibonacci)
  */
  const TAU = Math.PI * 2;

  function makeTorusKnot(n) {
    const out = new Float32Array(n * 3), P = 2, Q = 3;
    for (let i = 0; i < n; i++) {
      const u = (i / n) * TAU * P;
      const r = 4.6 + 1.9 * Math.cos(Q * u / P);
      /* a little thickness around the path, otherwise it's a hairline that disappears */
      const j = () => (Math.random() - 0.5) * 1.05;
      out[i * 3]     = r * Math.cos(u) + j();
      out[i * 3 + 1] = r * Math.sin(u) * 0.62 + j();
      out[i * 3 + 2] = 1.9 * Math.sin(Q * u / P) + j();
    }
    return out;
  }

  function makeHelix(n) {
    const out = new Float32Array(n * 3), turns = 3.2;
    for (let i = 0; i < n; i++) {
      const t = i / n, a = t * TAU * turns + (i % 2 ? Math.PI : 0);   // two opposed strands
      const j = () => (Math.random() - 0.5) * 0.55;
      out[i * 3]     = (t - 0.5) * 17 + j();
      out[i * 3 + 1] = Math.sin(a) * 3.1 + j();
      out[i * 3 + 2] = Math.cos(a) * 3.1 + j();
    }
    return out;
  }

  function makeWave(n) {
    const out = new Float32Array(n * 3), C = 84, R = Math.ceil(n / C);
    for (let i = 0; i < n; i++) {
      const c = i % C, r = Math.floor(i / C);
      const x = (c / (C - 1) - 0.5) * 19, y = (r / (R - 1) - 0.5) * 9.5;
      out[i * 3]     = x;
      out[i * 3 + 1] = y;
      out[i * 3 + 2] = Math.sin(x * 0.55) * 1.5 + Math.cos(y * 0.7) * 1.1;
    }
    return out;
  }

  function makeSphere(n) {
    const out = new Float32Array(n * 3), R = 5.4, GA = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      /* fibonacci sphere: evenly spaced without the pole clustering of naive lat/long */
      const y = 1 - (i / (n - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y)), th = GA * i;
      out[i * 3]     = Math.cos(th) * rad * R;
      out[i * 3 + 1] = y * R * 0.78;
      out[i * 3 + 2] = Math.sin(th) * rad * R;
    }
    return out;
  }

  const chaos = new Float32Array(COUNT * 3);
  const forms = [makeTorusKnot(COUNT), makeHelix(COUNT), makeWave(COUNT), makeSphere(COUNT)];
  const spin  = new Float32Array(COUNT);

  /* The scattered state deliberately overflows the frame on every axis. A cloud that politely
     stays inside the viewport reads as a flat panel of dots; one that spills past the borders
     reads as a space the page is sitting inside. */
  for (let i = 0; i < COUNT; i++) {
    chaos[i * 3]     = (Math.random() - 0.5) * 32;
    chaos[i * 3 + 1] = (Math.random() - 0.5) * 19;
    chaos[i * 3 + 2] = (Math.random() - 0.5) * 22;
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

  /* ---- resize -------------------------------------------------------------------------------
     Sized to the VIEWPORT, never to #hero3d. The hero box's height is scrubbed by GSAP on every
     scroll frame, and reallocating a WebGL drawing buffer that often is exactly what made the
     hero judder while scrolling. The canvas is pinned at viewport size and the host simply crops
     it (overflow:hidden), which costs nothing per frame. */
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < 700 ? 54 : 38;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize, { passive: true });
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
  let started = false;

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

    px += (tx - px) * 0.045;
    py += (ty - py) * 0.045;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      const drift = Math.sin(t * 0.5 + spin[i]) * (1 - m) * 1.6;

      /* while the figure is HELD, it stays alive: a slow wave breathes through the glyphs, and
         every 24th particle refuses to settle and keeps orbiting the number as a loose satellite.
         Without this the held beat froze solid and looked like a static image. */
      const wave = m * Math.sin(target[i3] * 0.5 - t * 1.4 + spin[i] * 0.3) * 0.09;
      const orbiter = (i % 24 === 0) ? m : 0;
      const oa = t * 0.6 + spin[i];

      const x = chaos[i3]     + (target[i3]     - chaos[i3])     * m + drift + wave
              + orbiter * Math.cos(oa) * 1.5;
      const y = chaos[i3 + 1] + (target[i3 + 1] - chaos[i3 + 1]) * m + drift * 0.7 + wave * 0.6
              + orbiter * Math.sin(oa * 1.3) * 1.1;
      const z = chaos[i3 + 2] + (target[i3 + 2] - chaos[i3 + 2]) * m
              + orbiter * Math.sin(oa) * 1.2;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(0.62 + m * 0.42);
      dummy.rotation.set(spin[i] + t * 0.25, spin[i] * 1.7 + t * 0.2, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      /* muted while scattered, brand violet once formed, with a lime crest sweeping the glyphs at
         full assembly -- the number "switching on" */
      const crest = m > 0.9 ? Math.pow(Math.max(0, Math.sin(x * 0.4 - t * 1.8)), 6) : 0;
      col.copy(INK).lerp(VIOLET, m).lerp(LIME, crest * 0.9);
      /* wash out toward the depth extremes: distant particles sink into the background and the
         ones rushing past the camera lighten off, which is what makes the overflow read as
         atmosphere rather than as debris */
      const depth = Math.min(1, Math.abs(z) / 18);
      col.lerp(BG, depth * 0.42);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    /* the resolved body turns slowly on its own axis so it reads as a sculpture in space rather
       than a flat pattern; cursor parallax rides on top of it */
    mesh.rotation.y = px * 0.4 + t * 0.09 * m;
    mesh.rotation.x = py * 0.26 + Math.sin(t * 0.14) * 0.10 * m;
    camera.position.x = px * 2.2;
    camera.position.y = -py * 1.4;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    if (!started) { started = true; host.classList.add('scene-live'); }
  })();
}
