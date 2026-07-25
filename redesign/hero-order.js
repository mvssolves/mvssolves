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
  const MOBILE_DPR_CAP = innerWidth <= 760 ? 1.6 : 2;
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

  /* cap DPR harder on phones: a 3x retina buffer of a full-screen particle field is the single
     biggest cost on mobile and is invisible at this particle size. */
  renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE_DPR_CAP));
  renderer.setClearAlpha(0);
  const canvas = renderer.domElement;
  canvas.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);'
    + 'width:100vw;height:100vh;display:block;';
  host.appendChild(canvas);

  /* ---- the field ----------------------------------------------------------------------------
     Spread deliberately overflows the frame on every axis. A cloud that stays politely inside the
     viewport reads as a flat panel of dots; one that spills past the borders reads as a space the
     page is sitting inside. */
  /* particle budget. 7000 instanced meshes with a per-frame CPU loop is fine on a laptop and
     punishing on a mid-range phone, where it also burns battery for a decorative background.
     The field still reads as a field at 2400 because the spread is unchanged -- it just thins. */
  const MOBILE = innerWidth <= 760;
  const COUNT = MOBILE ? 2400 : 7000;
  const mesh = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.055, 0),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95 }),
    COUNT
  );
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 3), 3);
  mesh.position.y = 1.5;
  scene.add(mesh);

  /* Bone & Iris. The field is warm graphite DUST with iris as a minority -- violet is banned
     from gradients, and a two-colour lerp across thousands of particles reads as exactly that.
     So the base is dust, iris marks structure, and flare only appears on disturbance. */
  const DUST   = new THREE.Color('#A79C88');    // ~85% of the field
  const IRIS   = new THREE.Color('#6650A8');
  const FLARE  = new THREE.Color('#E4622F');    // reaction only
  const BG     = new THREE.Color('#F5F1E9');    // the hero's own paper, for the depth fade

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

  /* ---- forming artwork ------------------------------------------------------------------------
     The field doesn't only flow -- it repeatedly GATHERS into a sculpture, holds it, then releases
     back into the flow. Four bodies, built from parametric surfaces so points land on real
     structure (an even distribution is what separates a form that reads as designed from a blob).
     Crucially the flow keeps running while a form is held, so a gathered shape still breathes and
     travels instead of freezing into a still image. */
  const TAU = Math.PI * 2;
  const forms = [];
  {
    const knot = new Float32Array(COUNT * 3), P = 2, Q = 3;
    for (let i = 0; i < COUNT; i++) {
      const u = (i / COUNT) * TAU * P;
      const r = 3.9 + 1.6 * Math.cos(Q * u / P);
      const j = () => (Math.random() - 0.5) * 1.2;
      knot[i * 3] = r * Math.cos(u) + j();
      knot[i * 3 + 1] = r * Math.sin(u) * 0.62 + j();
      knot[i * 3 + 2] = 1.7 * Math.sin(Q * u / P) + j();
    }
    forms.push(knot);

    const helix = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const f = i / COUNT, a = f * TAU * 3.4 + (i % 2 ? Math.PI : 0);
      const j = () => (Math.random() - 0.5) * 0.7;
      helix[i * 3] = (f - 0.5) * 15 + j();
      helix[i * 3 + 1] = Math.sin(a) * 2.6 + j();
      helix[i * 3 + 2] = Math.cos(a) * 2.6 + j();
    }
    forms.push(helix);

    const wave = new Float32Array(COUNT * 3), C = 100, R = Math.ceil(COUNT / C);
    for (let i = 0; i < COUNT; i++) {
      const c = i % C, rr = Math.floor(i / C);
      const x = (c / (C - 1) - 0.5) * 16, y = (rr / (R - 1) - 0.5) * 8;
      wave[i * 3] = x; wave[i * 3 + 1] = y;
      wave[i * 3 + 2] = Math.sin(x * 0.5) * 1.8 + Math.cos(y * 0.65) * 1.3;
    }
    forms.push(wave);

    const sphere = new Float32Array(COUNT * 3), RAD = 4.6, GA = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2, rad = Math.sqrt(Math.max(0, 1 - y * y)), th = GA * i;
      sphere[i * 3] = Math.cos(th) * rad * RAD;
      sphere[i * 3 + 1] = y * RAD * 0.8;
      sphere[i * 3 + 2] = Math.sin(th) * rad * RAD;
    }
    forms.push(sphere);
  }
  /* free-flow -> gather -> hold -> release, on a loop */
  const BEAT = 8;
  const easeIO = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  /* ---- artwork layer -------------------------------------------------------------------------
     Not just loose particles: a subset of the field is wired into a constellation. Each frame the
     link endpoints are refreshed from the live particle positions, so the graphic breathes and
     reacts along with everything else instead of being a static overlay.

     Pairs are chosen ONCE, at build time, from particles that start near each other. Rebuilding
     the neighbour search every frame would be O(n^2); the springs keep particles near home, so a
     pair picked at the start stays a plausible pair forever. */
  const LINKS = MOBILE ? 260 : 900;
  const linkPairs = new Int32Array(LINKS * 2);
  {
    let made = 0, guard = 0;
    while (made < LINKS && guard++ < LINKS * 60) {
      const a = (Math.random() * COUNT) | 0, b = (Math.random() * COUNT) | 0;
      if (a === b) continue;
      const dx = home[a * 3] - home[b * 3];
      const dy = home[a * 3 + 1] - home[b * 3 + 1];
      const dz = home[a * 3 + 2] - home[b * 3 + 2];
      if (dx * dx + dy * dy + dz * dz > 9) continue;      // near neighbours only
      linkPairs[made * 2] = a; linkPairs[made * 2 + 1] = b; made++;
    }
  }
  /* ---- ribbon artwork -------------------------------------------------------------------------
     A continuous ribbon threaded through the volume on a lissajous path, redrawn every frame so it
     writhes rather than looping identically. This is the piece that reads as deliberate ARTWORK
     over the top of the particle field -- the constellation links alone were too incidental to
     carry the frame on their own. */
  const RIB = MOBILE ? 220 : 420;
  const ribGeo = new THREE.BufferGeometry();
  const ribPos = new Float32Array(RIB * 3);
  const ribCol = new Float32Array(RIB * 3);
  ribGeo.setAttribute('position', new THREE.BufferAttribute(ribPos, 3));
  ribGeo.setAttribute('color', new THREE.BufferAttribute(ribCol, 3));
  const ribbon = new THREE.Line(
    ribGeo,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 })
  );
  ribbon.position.y = mesh.position.y;
  scene.add(ribbon);

  const linkGeo = new THREE.BufferGeometry();
  const linkPos = new Float32Array(LINKS * 6);
  const linkCol = new Float32Array(LINKS * 6);
  linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPos, 3));
  linkGeo.setAttribute('color', new THREE.BufferAttribute(linkCol, 3));
  const links = new THREE.LineSegments(
    linkGeo,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5 })
  );
  links.position.y = mesh.position.y;
  scene.add(links);

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

    /* morph clock: which sculpture, and how gathered we currently are */
    const formIdx = Math.floor(t / BEAT) % forms.length;
    const fp = (t % BEAT) / BEAT;
    let mForm;
    if (fp < 0.22)      mForm = easeIO(fp / 0.22);                 // gathering
    else if (fp < 0.68) mForm = 1;                                 // held (still flowing)
    else if (fp < 0.86) mForm = 1 - easeIO((fp - 0.68) / 0.18);    // releasing
    else                mForm = 0;                                 // free flow

    for (let i = 0; i < waves.length; i++) waves[i].t += dt;
    while (waves.length && waves[0].t > 2.2) waves.shift();

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;

      /* CONSTANT FLOW. The home position itself travels on a curl-like field built from cheap
         layered sines, so nothing ever settles -- the field is always moving even when untouched.
         Amplitudes are large enough to read as motion at a glance, slow enough not to distract
         from the headline. */
      const px0 = home[i3], py0 = home[i3 + 1], pz0 = home[i3 + 2];
      /* Fast, wide travel. The previous amplitudes were a drift; at a glance the field looked
         static. These are large enough that individual particles visibly stream across the frame
         while the volume as a whole stays balanced. */
      const hx = px0 + Math.sin(t * 0.95 + py0 * 0.16 + spin[i]) * 5.6
                     + Math.cos(t * 0.52 + pz0 * 0.11) * 3.0;
      const hy = py0 + Math.cos(t * 0.83 + px0 * 0.14 + spin[i] * 1.3) * 4.4
                     + Math.sin(t * 0.61 + pz0 * 0.15) * 2.4;
      const hz = pz0 + Math.sin(t * 0.71 + px0 * 0.12 + spin[i] * 0.7) * 4.8;

      /* gather toward the current sculpture. The flow is still added on top at reduced amplitude
         while held, so the formed body keeps moving rather than locking rigid. */
      let tx2 = hx, ty2 = hy, tz2 = hz;
      if (mForm > 0.001) {
        const f = forms[formIdx], swim = 1 - mForm * 0.97;   // held forms read as solid geometry
        tx2 = f[i3]     + (hx - px0) * swim;
        ty2 = f[i3 + 1] + (hy - py0) * swim;
        tz2 = f[i3 + 2] + (hz - pz0) * swim;
        tx2 = hx + (tx2 - hx) * mForm;
        ty2 = hy + (ty2 - hy) * mForm;
        tz2 = hz + (tz2 - hz) * mForm;
        /* twist peaks mid-transition and vanishes at both ends, so the sculpture itself is never
           rotated out of true -- only the journey into and out of it spirals */
        const twist = Math.sin(mForm * Math.PI) * 2.4;
        if (twist > 0.001) {
          const ca = Math.cos(twist), sa = Math.sin(twist);
          const rx2 = tx2 * ca - ty2 * sa, ry2 = tx2 * sa + ty2 * ca;
          tx2 = rx2; ty2 = ry2;
        }
      }

      /* spring home + damping: any disturbance heals itself */
      /* pull hardens as the form gathers, so the sculpture actually arrives inside the beat
         instead of lagging behind a fast-moving flow field */
      const k = 9.0 + mForm * 20.0;
      vel[i3]     += (tx2 - pos[i3])     * k * dt;
      vel[i3 + 1] += (ty2 - pos[i3 + 1]) * k * dt;
      vel[i3 + 2] += (tz2 - pos[i3 + 2]) * k * dt;

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

      vel[i3] *= 0.93; vel[i3 + 1] *= 0.93; vel[i3 + 2] *= 0.93;
      pos[i3]     += vel[i3];
      pos[i3 + 1] += vel[i3 + 1];
      pos[i3 + 2] += vel[i3 + 2];

      const x = pos[i3], y = pos[i3 + 1], z = pos[i3 + 2];
      dummy.position.set(x, y, z);
      const pop = mForm > 0.9 ? 1 + Math.max(0, Math.sin((mForm - 0.9) / 0.1 * Math.PI)) * 0.5 : 1;
      dummy.scale.setScalar(size[i] * pop);
      dummy.rotation.set(spin[i] + t * 0.22, spin[i] * 1.7 + t * 0.17, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      /* violet field; particles light lime as they're disturbed, so the REACTION is what you see
         rather than a decorative colour cycle */
      /* flare is meant to be RARE -- at *26 a large share of the field was permanently orange
         from ambient flow alone, which read as a third brand colour rather than a reaction.
         Raised threshold plus a hard ceiling: only genuinely fast particles light up. */
      const v2 = vel[i3] * vel[i3] + vel[i3 + 1] * vel[i3 + 1];
      const speed = Math.min(0.85, Math.max(0, (v2 - 0.02)) * 55);
      /* a fixed minority of particles carry iris; the rest are dust. Assigning by index keeps it
         stable frame to frame instead of shimmering. */
      const isIris = (i % 7) === 0;
      /* lime rides both the disturbance AND a crest travelling across a gathered form, so the
         sculpture visibly "switches on" as it completes */
      const crest = mForm > 0.85 ? Math.pow(Math.max(0, Math.sin(x * 0.32 - t * 1.5)), 6) * mForm : 0;
      col.copy(isIris ? IRIS : DUST).lerp(FLARE, Math.max(speed, crest * 0.9));
      const depth = Math.min(1, Math.abs(z) / 18);
      col.lerp(BG, depth * 0.42);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    /* redraw the constellation from live positions. Links fade out as their two particles drift
       apart, so the graphic forms and dissolves continuously rather than looking like fixed wire. */
    for (let l = 0; l < LINKS; l++) {
      const a = linkPairs[l * 2] * 3, b = linkPairs[l * 2 + 1] * 3, o = l * 6;
      linkPos[o]     = pos[a];     linkPos[o + 1] = pos[a + 1]; linkPos[o + 2] = pos[a + 2];
      linkPos[o + 3] = pos[b];     linkPos[o + 4] = pos[b + 1]; linkPos[o + 5] = pos[b + 2];
      const dx = pos[a] - pos[b], dy = pos[a + 1] - pos[b + 1], dz = pos[a + 2] - pos[b + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const k = Math.max(0, 1 - d / 5.5);          // 0 once the pair has drifted too far apart
      col.copy(DUST).lerp(BG, 1 - k * 0.85);
      linkCol[o] = linkCol[o + 3] = col.r;
      linkCol[o + 1] = linkCol[o + 4] = col.g;
      linkCol[o + 2] = linkCol[o + 5] = col.b;
    }
    linkGeo.attributes.position.needsUpdate = true;
    linkGeo.attributes.color.needsUpdate = true;

    /* the ribbon: a lissajous curve whose frequencies drift, so the figure never repeats exactly.
       Coloured violet->lime along its length so it reads as one travelling stroke. */
    for (let k = 0; k < RIB; k++) {
      const u = (k / (RIB - 1)) * Math.PI * 2;
      const a = 3.1 + Math.sin(t * 0.07) * 0.9;
      const b = 2.0 + Math.cos(t * 0.05) * 0.7;
      const o = k * 3;
      ribPos[o]     = Math.sin(u * a + t * 0.42) * 13.5;
      ribPos[o + 1] = Math.sin(u * b + t * 0.31) * 7.6;
      ribPos[o + 2] = Math.cos(u * 2.0 + t * 0.25) * 8.5;
      col.copy(IRIS).lerp(FLARE, (Math.sin(u * 3 - t * 0.9) + 1) * 0.5 * 0.35);
      ribCol[o] = col.r; ribCol[o + 1] = col.g; ribCol[o + 2] = col.b;
    }
    ribGeo.attributes.position.needsUpdate = true;
    ribGeo.attributes.color.needsUpdate = true;

    if (!reduceMotion) {
      /* a permanent slow yaw on top of cursor parallax, so the whole volume is always turning and
         the depth of the field is legible even without moving the mouse */
      const ry = ndc.x * 0.10 + Math.sin(t * 0.06) * 0.16;
      const rx = -ndc.y * 0.06 + Math.sin(t * 0.045) * 0.07;
      mesh.rotation.y = links.rotation.y = ribbon.rotation.y = ry;
      mesh.rotation.x = links.rotation.x = ribbon.rotation.x = rx;
    }

    renderer.render(scene, camera);
    if (!started) { started = true; host.classList.add('scene-live'); }
  })();
}
