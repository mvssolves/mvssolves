/* HERO — a single field of particles. No shapes, no glyphs, no cards.
 *
 * The cloud flares out past every edge of the frame and simply lives there: drifting, breathing,
 * and reacting to the pointer. Everything this hero went through before — the six-form scene, the
 * DOM card collage, the stat typography, the sculpted bodies — has been removed. What's left is
 * the one thing that consistently looked right: the flare itself.
 *
 * Interaction is the design now:
 *   hover  the field is pushed out of the cursor's way, parting around it like something physical
 *   click  a ring of force expands from the click point, shoving particles outward, then settles
 *
 * Physics is a spring back to each particle's home position, so any disturbance heals on its own.
 * There is no state to reset and nothing that can end up permanently deformed.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

const host = document.getElementById('hero3d');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (host) init(host);

function init(host) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return;                                    // no WebGL: the hero is simply its gradient
  }

  host.classList.add('scene-booting');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.set(0, 0, 26);

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearAlpha(0);
  const canvas = renderer.domElement;
  canvas.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);'
    + 'width:100vw;height:100vh;display:block;';
  host.appendChild(canvas);

  /* ---- the field ----------------------------------------------------------------------------
     Spread deliberately overflows the frame on every axis. A cloud that stays politely inside the
     viewport reads as a flat panel of dots; one that spills past the borders reads as a space the
     page is sitting inside. */
  const COUNT = 7000;
  const mesh = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.055, 0),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95 }),
    COUNT
  );
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 3), 3);
  mesh.position.y = 1.5;
  scene.add(mesh);

  const VIOLET = new THREE.Color('#9070DF');
  const LIME   = new THREE.Color('#E6F536');
  const BG     = new THREE.Color('#efecf7');    // the hero's own background, for the depth fade

  const home = new Float32Array(COUNT * 3);     // rest position
  const pos  = new Float32Array(COUNT * 3);     // live position
  const vel  = new Float32Array(COUNT * 3);     // velocity
  const spin = new Float32Array(COUNT);
  const size = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    home[i3]     = (Math.random() - 0.5) * 34;
    home[i3 + 1] = (Math.random() - 0.5) * 21;
    home[i3 + 2] = (Math.random() - 0.5) * 24;
    pos[i3] = home[i3]; pos[i3 + 1] = home[i3 + 1]; pos[i3 + 2] = home[i3 + 2];
    spin[i] = Math.random() * Math.PI * 2;
    size[i] = 0.55 + Math.random() * 0.7;       // varied scale, so it isn't a uniform dot screen
  }

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  /* ---- pointer -------------------------------------------------------------------------------
     The cursor is projected onto the z=0 plane so "distance to cursor" is measured in the same
     world units as the particles, not in screen pixels — otherwise the interaction radius would
     change every time the hero box is resized or scrubbed. */
  const ndc = new THREE.Vector2(-10, -10);
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const cursor = new THREE.Vector3(999, 999, 0);
  let pointerIn = false;

  addEventListener('pointermove', e => {
    ndc.x = (e.clientX / innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / innerHeight) * 2 + 1;
    pointerIn = true;
  }, { passive: true });
  addEventListener('pointerleave', () => { pointerIn = false; }, { passive: true });

  /* click shockwaves: an expanding ring of force. Several can overlap. */
  const waves = [];
  addEventListener('pointerdown', () => {
    if (!pointerIn) return;
    waves.push({ x: cursor.x, y: cursor.y, t: 0 });
    if (waves.length > 4) waves.shift();
  }, { passive: true });

  /* ---- resize --------------------------------------------------------------------------------
     Sized to the VIEWPORT, never to #hero3d — the hero box's height is scrubbed by GSAP on every
     scroll frame, and reallocating a WebGL drawing buffer that often is what made scrolling
     judder. The host simply crops the canvas. */
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = innerWidth < 700 ? 54 : 38;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize, { passive: true });
  resize();

  let visible = true;
  new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; }), { threshold: 0 })
    .observe(host);

  const clock = new THREE.Clock();
  let started = false;

  const REPEL = 3.4;                            // world-space radius of the cursor's influence
  const REPEL2 = REPEL * REPEL;

  (function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;

    const t = clock.getElapsedTime();
    const dt = Math.min(clock.getDelta(), 0.05);   // clamped: a backgrounded tab must not explode

    if (pointerIn) {
      ray.setFromCamera(ndc, camera);
      ray.ray.intersectPlane(plane, cursor);
      cursor.y -= mesh.position.y;                 // into the mesh's own space
    }

    for (let i = 0; i < waves.length; i++) waves[i].t += dt;
    while (waves.length && waves[0].t > 2.2) waves.shift();

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;

      /* ambient drift — the field is never completely still */
      const hx = home[i3]     + Math.sin(t * 0.35 + spin[i]) * 0.5;
      const hy = home[i3 + 1] + Math.cos(t * 0.28 + spin[i] * 1.3) * 0.42;
      const hz = home[i3 + 2] + Math.sin(t * 0.22 + spin[i] * 0.7) * 0.4;

      /* spring home + damping: any disturbance heals itself */
      vel[i3]     += (hx - pos[i3])     * 5.5 * dt;
      vel[i3 + 1] += (hy - pos[i3 + 1]) * 5.5 * dt;
      vel[i3 + 2] += (hz - pos[i3 + 2]) * 5.5 * dt;

      if (pointerIn) {
        const dx = pos[i3] - cursor.x, dy = pos[i3 + 1] - cursor.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < REPEL2) {
          const d = Math.sqrt(d2) || 0.0001;
          const f = Math.pow(1 - d / REPEL, 2) * 46 * dt;
          vel[i3]     += (dx / d) * f;
          vel[i3 + 1] += (dy / d) * f;
          vel[i3 + 2] += (0.6 - Math.random()) * f * 0.5;
        }
      }

      for (let w = 0; w < waves.length; w++) {
        const wv = waves[w];
        const R = wv.t * 13;                       // ring radius grows with age
        const dx = pos[i3] - wv.x, dy = pos[i3 + 1] - wv.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        const band = Math.abs(d - R);
        if (band < 2.4) {
          const f = (1 - band / 2.4) * (1 - wv.t / 2.2) * 120 * dt;
          vel[i3]     += (dx / d) * f;
          vel[i3 + 1] += (dy / d) * f;
        }
      }

      vel[i3] *= 0.90; vel[i3 + 1] *= 0.90; vel[i3 + 2] *= 0.90;
      pos[i3]     += vel[i3];
      pos[i3 + 1] += vel[i3 + 1];
      pos[i3 + 2] += vel[i3 + 2];

      const x = pos[i3], y = pos[i3 + 1], z = pos[i3 + 2];
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(size[i]);
      dummy.rotation.set(spin[i] + t * 0.22, spin[i] * 1.7 + t * 0.17, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      /* violet field; particles light lime as they're disturbed, so the REACTION is what you see
         rather than a decorative colour cycle */
      const speed = Math.min(1, (vel[i3] * vel[i3] + vel[i3 + 1] * vel[i3 + 1]) * 26);
      col.copy(VIOLET).lerp(LIME, speed);
      const depth = Math.min(1, Math.abs(z) / 18);
      col.lerp(BG, depth * 0.42);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    if (!reduceMotion) {
      mesh.rotation.y = ndc.x * 0.10;
      mesh.rotation.x = -ndc.y * 0.06;
    }

    renderer.render(scene, camera);
    if (!started) { started = true; host.classList.add('scene-live'); }
  })();
}
