/* ═══════════════════════════════════════════════════════════════════
   ICEHOUSE — the building itself, in 3D.

   Not a model file. The whole thing is generated from js/floors.js at
   runtime, which is why it weighs nothing beyond three.js and why it
   cannot disagree with the plans or the copy: the same rectangles that
   draw a unit on the plan extrude into that unit in the section.

   It is a cut model, not a render. Brick on three sides, the south
   elevation left as its steel window frame so you can see the floors
   stacked behind it, and the slabs sitting on their columns. The floor
   you are on is drawn in brass — its units outlined, the slab lit — and
   everything above and below it goes quiet. Late sun rakes in from the
   west, because that is what the copy on Level 5 says happens.

   Deliberately NOT using three's stock RoomEnvironment: it lights a
   scene with emissive boxes that read back as soft white blobs, which
   is exactly the unresolved problem on Micron. Explicit lights only.

   Loaded on demand, and only ever an enhancement — the plans are real
   SVG and the copy is real text with or without this.
   ═══════════════════════════════════════════════════════════════════ */

const THREE = await import('../../lib/three.module.js');

/* the palette, matched to icehouse.css rather than re-invented.
   Lighter than the CSS values on purpose: ACES tone mapping pulls
   mid-tones down hard, and a wall authored at the CSS slate renders as
   an unreadable black mass. These are the values that come OUT looking
   like the page. */
const C = {
  slate:   0x54646f,
  slateD:  0x3d4b55,
  brick:   0x6d7078,
  steel:   0x9fb0bc,
  brass:   0xe0ae5d,
  ice:     0xdfe6ea
};

export async function mountBuilding(host, opts = {}) {
  const B = window.ICEHOUSE;
  if (!host || !B) return null;

  const coarse = matchMedia('(pointer: coarse)').matches;

  /* ── renderer ──────────────────────────────────────────────────── */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !coarse, alpha: true, powerPreference: 'high-performance'
    });
  } catch (e) { return null; }
  if (!renderer.getContext()) return null;

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.4 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.className = 'b3-canvas';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  /* fog in the ground colour, so the base of the building dissolves
     into the section rather than ending on a hard edge */
  scene.fog = new THREE.Fog(0x243039, 200, 460);

  const camera = new THREE.PerspectiveCamera(30, 1, 1, 900);

  /* ── the geometry, in feet ─────────────────────────────────────── */
  const W = B.W, D = B.D;
  const SLAB = 1.3;
  const bases = [];
  let y = 0;
  B.floors.forEach(f => { bases.push(y); y += f.h; });
  const TOP = y;

  const root = new THREE.Group();
  /* stand the building on its own centre so orbiting is about the
     building, not about the corner it happens to be modelled from */
  root.position.set(-W / 2, 0, -D / 2);
  scene.add(root);

  const mat = {
    brick: new THREE.MeshStandardMaterial({ color: C.brick, roughness: 0.94, metalness: 0.0 }),
    slab:  new THREE.MeshStandardMaterial({ color: C.slate, roughness: 0.88, metalness: 0.0 }),
    steel: new THREE.MeshStandardMaterial({ color: C.steel, roughness: 0.42, metalness: 0.85 }),
    tank:  new THREE.MeshStandardMaterial({ color: C.steel, roughness: 0.55, metalness: 0.7 })
  };

  function box(w, h, d, m, x, yy, z) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    g.position.set(x, yy, z);
    root.add(g);
    return g;
  }

  /* shell: north, east and west in brick. The south face is left open —
     this is a section, and the point is to see the floors stacked. */
  const T = 2.2;
  box(W, TOP + 3, T, mat.brick, W / 2, (TOP + 3) / 2, D - T / 2);          /* north */
  box(T, TOP + 3, D, mat.brick, T / 2, (TOP + 3) / 2, D / 2);              /* west  */
  box(T, TOP + 3, D, mat.brick, W - T / 2, (TOP + 3) / 2, D / 2);          /* east  */
  box(W, 2.4, D, mat.brick, W / 2, -1.2, D / 2);                           /* base  */

  /* slabs */
  const slabs = B.floors.map((f, i) =>
    box(W - T * 2, SLAB, D - T * 2, mat.slab.clone(), W / 2, bases[i], D / 2));

  /* roof slab, then the water tank that is not going anywhere */
  box(W - T * 2, SLAB, D - T * 2, mat.slab, W / 2, TOP, D / 2);
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(11, 11, 17, 22), mat.tank);
  tank.position.set(W * 0.66, TOP + 15, D * 0.5);
  root.add(tank);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(11.6, 4.5, 22), mat.tank);
  cone.position.set(W * 0.66, TOP + 25.7, D * 0.5);
  root.add(cone);
  for (let a = 0; a < 4; a++) {
    const th = (a / 4) * Math.PI * 2 + Math.PI / 4;
    box(1.1, 6.6, 1.1, mat.steel,
        W * 0.66 + Math.cos(th) * 9, TOP + 3.3, D * 0.5 + Math.sin(th) * 9);
  }

  /* the column grid — 1924, regular, and in the way */
  const colGeo = new THREE.BoxGeometry(1.9, TOP, 1.9);
  const cols = [];
  for (let cx = 20; cx < W; cx += 20)
    for (let cz = 20; cz < D; cz += 20) cols.push([cx, cz]);
  const colMesh = new THREE.InstancedMesh(colGeo, mat.steel, cols.length);
  const m4 = new THREE.Matrix4();
  cols.forEach((c, i) => {
    m4.makeTranslation(c[0], TOP / 2, c[1]);
    colMesh.setMatrixAt(i, m4);
  });
  root.add(colMesh);

  /* The south elevation: crittall bays, cut for machinery not for views.
     Mullions only — the glass is the gap you look through. Bays at twelve
     feet, not seven: a mullion every seven reads as a cage, and these
     windows were cut wide enough to get machinery through. */
  const mull = [];
  for (let mx = 6; mx <= W - 6; mx += 12) mull.push(mx);
  const mullGeo = new THREE.BoxGeometry(0.5, TOP, 0.5);
  const mullMesh = new THREE.InstancedMesh(mullGeo, mat.steel, mull.length);
  mull.forEach((mx, i) => {
    m4.makeTranslation(mx, TOP / 2, 0.9);
    mullMesh.setMatrixAt(i, m4);
  });
  root.add(mullMesh);
  B.floors.forEach((f, i) => {                       /* transoms at each floor */
    box(W - 10, 0.5, 0.5, mat.steel, W / 2, bases[i] + f.h * 0.66, 0.9);
  });

  /* ── the units, one group per floor ─────────────────────────────
     Solid mass plus a brass edge. The edge is what makes it read as a
     drawing rather than a render, and it is the only place brass is
     used, exactly as in the rest of the build. */
  const floorGroups = B.floors.map((f, i) => {
    const g = new THREE.Group();
    /* WebGL line width is one pixel on every desktop GPU regardless of
       what you ask for, so the active floor cannot be picked out by a
       heavier outline. It is picked out by emission instead — the units
       on your floor are lit from inside, which is also just a truer
       thing for a building to do. */
    const bodyMat = new THREE.MeshStandardMaterial({
      color: C.slateD, roughness: 0.9, transparent: true, opacity: 0.0,
      emissive: new THREE.Color(C.brass), emissiveIntensity: 0.0
    });
    const lineMat = new THREE.LineBasicMaterial({
      color: C.brass, transparent: true, opacity: 0.0
    });
    const h = f.h - SLAB - 1.4;
    f.units.forEach(u => {
      /* a terrace has no volume — it is the absence of one, so it gets
         the outline and none of the mass */
      const geo = new THREE.BoxGeometry(u.w, u.t ? 0.6 : h, u.d);
      const cx = u.x + u.w / 2, cz = u.y + u.d / 2;
      const cy = bases[i] + SLAB / 2 + (u.t ? 0.3 : h / 2);
      if (!u.t) {
        const mesh = new THREE.Mesh(geo, bodyMat);
        mesh.position.set(cx, cy, cz);
        g.add(mesh);
      }
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat);
      edge.position.set(cx, cy, cz);
      g.add(edge);
    });
    g.userData = { bodyMat, lineMat, slab: slabs[i] };
    root.add(g);
    return g;
  });

  /* ── light shafts ───────────────────────────────────────────────
     Late sun through the west bays. Additive quads with a falloff in
     the shader rather than a texture, so they cost nothing to ship.
     Off on coarse pointers: they are the first thing worth dropping on
     a phone and the scene reads fine without them. */
  let shafts = null;
  if (!coarse) {
    const shaftMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { tint: { value: new THREE.Color(0xffcf94) }, amp: { value: 0.0 } },
      vertexShader: `varying vec2 vu;void main(){vu=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `
        varying vec2 vu; uniform vec3 tint; uniform float amp;
        void main(){
          /* soft along the width, and fading out as it travels away from
             the glass — a beam has a source and a reach, not two ends */
          float across = smoothstep(0.0,0.30,vu.x)*smoothstep(1.0,0.70,vu.x);
          float along  = (1.0-smoothstep(0.05,0.95,vu.y));
          gl_FragColor = vec4(tint, across*along*0.30*amp);
        }`
    });
    /* Beams come through the west bays and land on the floor you are on,
       so the group is moved rather than rebuilt as you climb. Local
       coordinates: x=0 is the west wall, z runs south to north. */
    shafts = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const q = new THREE.Mesh(new THREE.PlaneGeometry(11, 74), shaftMat);
      q.position.set(30, 4, 20 + i * 24);
      q.rotation.set(Math.PI / 2, 0, 0);
      q.rotation.z = 0;
      shafts.add(q);
    }
    shafts.userData.mat = shaftMat;
    root.add(shafts);
  }

  /* ── light ─────────────────────────────────────────────────────── */
  scene.add(new THREE.HemisphereLight(0xa8c2d2, 0x2b343b, 1.5));
  scene.add(new THREE.AmbientLight(0x8fa6b6, 0.55));
  /* late sun, from the west and low — the direction the copy on Level 5
     claims it comes from, so the model and the words agree */
  const sun = new THREE.DirectionalLight(0xffd9a8, 2.2);
  sun.position.set(-190, 70, -60);
  scene.add(sun);
  /* cold fill from the open south face, so the floors inside read */
  const fill = new THREE.DirectionalLight(0x9fc4dd, 1.1);
  fill.position.set(60, 60, -200);
  scene.add(fill);
  /* one rim off the north brick so the mass never goes flat black */
  const rim = new THREE.DirectionalLight(0xbcd6e6, 0.55);
  rim.position.set(80, 40, 190);
  scene.add(rim);

  /* ── the ride ───────────────────────────────────────────────────
     `floor` is fractional on purpose: the pinned section scrubs it, so
     the camera climbs continuously and the floors cross-fade rather
     than snapping. That is what makes it feel like a lift instead of a
     slideshow. */
  const state = { floor: 0, spin: 0, ptrX: 0, ptrY: 0, tPtrX: 0, tPtrY: 0 };

  function camFor(f) {
    const i = Math.max(0, Math.min(B.floors.length - 1, f));
    const lo = Math.floor(i), hi = Math.min(B.floors.length - 1, lo + 1);
    const t = i - lo;
    const eye = bases[lo] + (bases[hi] - bases[lo]) * t + 7;
    return eye;
  }

  let W2 = 1, H2 = 1;
  function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W2 = r.width; H2 = r.height;
    renderer.setSize(W2, H2, false);
    camera.aspect = W2 / H2;
    /* a narrow stage has to stand further back or the building will not
       fit in frame — this is why the phone composition still works */
    camera.updateProjectionMatrix();
  }
  resize();

  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(host); else addEventListener('resize', resize);

  if (!coarse) {
    host.addEventListener('pointermove', e => {
      const r = host.getBoundingClientRect();
      state.tPtrX = ((e.clientX - r.left) / r.width - 0.5) * 2;
      state.tPtrY = ((e.clientY - r.top) / r.height - 0.5) * 2;
    }, { passive: true });
    host.addEventListener('pointerleave', () => { state.tPtrX = 0; state.tPtrY = 0; }, { passive: true });
  }

  let raf = 0, alive = true, onScreen = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { onScreen = es[0].isIntersecting; },
      { rootMargin: '120px 0px' }).observe(host);
  }

  function tick() {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    if (!onScreen || !W2) return;

    state.ptrX += (state.tPtrX - state.ptrX) * 0.05;
    state.ptrY += (state.tPtrY - state.ptrY) * 0.05;

    /* The south elevation is the open one, and root is shifted by -D/2,
       so the south face sits at NEGATIVE world z. The camera has to be
       on that side or it spends the whole ride staring at the back of a
       solid brick wall — which is exactly what the first cut did.
       ang is measured so that cos(ang) < 0 puts us south of it. */
    const f = state.floor;
    const ang = 2.42 + f * 0.05 + state.ptrX * 0.16;

    /* Frame the whole building, always. The camera climbs, but it climbs
       backwards as well as up, so the stack stays legible instead of the
       top floors sailing out of shot. */
    /* Fitted rather than guessed: the mass is 120 × 84 on plan and about
       98 tall to the top of the tank, so at a 30° vertical field it needs
       roughly 260 units to fit at all and this leaves margin on top. */
    /* Fitted from the frame rather than guessed per breakpoint. The mass
       is about 150 across the diagonal and 100 tall, so whichever of the
       two the stage is tighter on decides the distance — which is why
       this holds up on a phone and on a 1600px stage without a table of
       magic numbers. */
    const half = Math.tan((camera.fov * Math.PI / 180) / 2);
    const dist = Math.max(100 / (2 * half), 152 / (2 * half * camera.aspect)) + 58 + f * 6;
    const eye = camFor(f);

    /* the target sits near the middle of the mass, not near its foot, or
       the building rides high in the frame with dead space beneath it */
    camera.position.set(
      Math.sin(ang) * dist,
      56 + eye * 0.5 - state.ptrY * 12,
      Math.cos(ang) * dist
    );
    camera.lookAt(0, 44 + eye * 0.35, 0);

    /* the floor you are on is the only one drawn */
    floorGroups.forEach((g, i) => {
      const near = 1 - Math.min(1, Math.abs(i - f) * 1.35);
      /* every floor keeps a faint outline, so the building never looks
         hollow — only the one you are on is lit */
      g.userData.lineMat.opacity = 0.14 + near * 0.8;
      g.userData.bodyMat.opacity = 0.1 + near * 0.55;
      g.userData.bodyMat.emissiveIntensity = near * 0.5;
      g.userData.slab.material.emissive.setHex(C.brass);
      g.userData.slab.material.emissiveIntensity = near * 0.11;
    });
    if (shafts) {
      /* the beams land on whichever floor you are on */
      shafts.position.y = camFor(f) - 4;
      shafts.userData.mat.uniforms.amp.value = 1;
    }

    renderer.render(scene, camera);
  }
  tick();

  /* wait for one real frame before telling the page it can drop the
     placeholder — otherwise the plan cross-fades out to an empty canvas */
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  host.classList.add('b3-live');

  return {
    set floor(v) { state.floor = v; },
    get floor() { return state.floor; },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
