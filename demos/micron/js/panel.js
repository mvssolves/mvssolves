/* ═══════════════════════════════════════════════════════════════════
   MICRON — the panel.

   A real automotive paint stack, rendered rather than described.

   three.js models clear coat as an actual second specular lobe over the
   base coat, which is exactly what car paint is: pigment and metallic
   flake under a transparent layer roughly forty-five microns thick. So
   this is not 3D bolted onto the page for effect — it is the only way to
   show the thing the whole build is about. Take microns off the clear
   coat and you watch the reflection go dull, because that is what
   removing microns actually does.

   Loaded only when the section is near the viewport: three.js is 2 MB
   raw and no visitor should pay for it above the fold, or at all if they
   never scroll this far.

   With no WebGL, no module support or reduced motion, the section keeps
   its readings and its copy and simply never mounts.
   ═══════════════════════════════════════════════════════════════════ */

export async function mountPanel(host) {
  const THREE = await import('../../lib/three.module.js');
  const { RoomEnvironment } = await import('../../lib/RoomEnvironment.js');
  const { RectAreaLightUniformsLib } = await import('../../lib/RectAreaLightUniformsLib.js');
  // RectAreaLight silently contributes nothing until this is initialised —
  // the strip light was in the scene and doing absolutely nothing.
  RectAreaLightUniformsLib.init();

  const canvas = host.querySelector('canvas');
  if (!canvas) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  // far enough back that the panel has edges. Filling the frame turned it
  // into a blue gradient — you have to see the silhouette to read a curve.
  camera.position.set(0, 0.1, 6.0);

  // The environment is doing nearly all the lighting. Clear coat is only
  // legible as a reflection, so a room to reflect is not optional here.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;

  /* Two lights doing different jobs. The strip is what a detail shop
     actually inspects under — a long fluorescent tube whose reflection
     stretches across the curve, and whose crispness is the tell. The
     rim separates the panel from the background so it reads as an
     object rather than a wash of colour. */
  const strip = new THREE.RectAreaLight(0xffffff, 48, 6.2, 0.07);
  strip.position.set(-0.4, 1.6, 2.6);
  strip.lookAt(0, -0.15, 0);
  scene.add(strip);

  const rim = new THREE.DirectionalLight(0xbcd9ff, 1.5);
  rim.position.set(2.8, -1.4, 1.6);
  scene.add(rim);

  /* ── the panel: a shallow compound curve, the way a door skin is
     pressed. A flat plane would read as a swatch, not a car. */
  const geo = new THREE.PlaneGeometry(3.1, 1.95, 180, 120);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    // a real door skin: a strong horizontal crown, a slight vertical one,
    // and a swage line low down that the strip reflection has to bend over
    const z = Math.cos(x * 0.68) * 0.34
            + Math.cos(y * 0.80) * 0.09
            - Math.exp(-Math.pow((y + 0.42) * 3.1, 2)) * 0.085
            - 0.36;
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();

  const paint = new THREE.MeshPhysicalMaterial({
    color: 0x14304a,          // a deep blue base, close to the hero photograph
    metalness: 0.86,
    roughness: 0.30,          // metallic flake scatters; it is not a mirror
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 0.55
  });
  const panel = new THREE.Mesh(geo, paint);
  scene.add(panel);

  /* ── state ─────────────────────────────────────────────────────── */
  const FULL = 45;            // microns of clear coat on a healthy panel
  let microns = FULL;
  let tx = -0.17, ty = -0.06, cx = -0.17, cy = -0.06;   // target and current tilt
  let alive = true, visible = false;

  function grade() {
    // Clear coat does not vanish evenly — it thins, scatters more, and the
    // reflection goes soft long before it goes away. Under about 25 microns
    // there is nothing safe left to cut, and the surface shows it.
    const t = microns / FULL;
    paint.clearcoat = 0.25 + 0.75 * t;
    paint.clearcoatRoughness = 0.03 + 0.42 * Math.pow(1 - t, 1.4);
    paint.roughness = 0.38 + 0.30 * Math.pow(1 - t, 1.7);
    paint.needsUpdate = true;
  }

  function size() {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function frame() {
    if (!alive) return;
    requestAnimationFrame(frame);
    if (!visible) return;
    cx += (tx - cx) * 0.06;
    cy += (ty - cy) * 0.06;
    panel.rotation.y = cx;
    panel.rotation.x = cy;
    renderer.render(scene, camera);
  }

  /* ── tilting it is the whole point: you cannot judge a finish head-on,
     which is why a detailer moves around the panel rather than staring
     at it. Pointer on desktop, drag on touch, arrow keys for keyboard. */
  let dragging = false, px = 0, py = 0;
  const LIMIT = 0.55;
  const clamp = (v) => Math.max(-LIMIT, Math.min(LIMIT, v));

  host.addEventListener('pointerdown', (e) => {
    dragging = true; px = e.clientX; py = e.clientY;
    host.setPointerCapture(e.pointerId);
    host.classList.add('is-held');
  });
  host.addEventListener('pointermove', (e) => {
    if (dragging) {
      tx = clamp(tx + (e.clientX - px) * 0.005);
      ty = clamp(ty + (e.clientY - py) * 0.004);
      px = e.clientX; py = e.clientY;
    } else if (e.pointerType === 'mouse') {
      const r = host.getBoundingClientRect();
      tx = clamp(((e.clientX - r.left) / r.width - 0.5) * 0.75);
      ty = clamp(((e.clientY - r.top) / r.height - 0.5) * 0.45);
    }
  });
  const stop = (e) => {
    dragging = false; host.classList.remove('is-held');
    if (e && e.pointerId != null && host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
  };
  host.addEventListener('pointerup', stop);
  host.addEventListener('pointercancel', stop);
  host.addEventListener('pointerleave', () => { if (!dragging) { tx = 0; ty = 0; } });

  host.setAttribute('tabindex', '0');
  host.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [-0.09, 0], ArrowRight: [0.09, 0], ArrowUp: [0, -0.07], ArrowDown: [0, 0.07] }[e.key];
    if (!k) return;
    e.preventDefault();
    tx = clamp(tx + k[0]); ty = clamp(ty + k[1]);
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { rootMargin: '15% 0px' }).observe(host);
  } else { visible = true; }

  addEventListener('resize', size, { passive: true });
  size(); grade(); frame();
  host.classList.add('is-live');

  return {
    set microns(v) { microns = v; grade(); },
    get microns() { return microns; },
    destroy() { alive = false; renderer.dispose(); geo.dispose(); paint.dispose(); pmrem.dispose(); }
  };
}
