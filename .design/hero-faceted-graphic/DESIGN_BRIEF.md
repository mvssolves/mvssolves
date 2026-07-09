# Hero 3D — Design Brief

## Why this brief exists
8 hero shapes shipped this session with no explicit direction (node network, wireframe sphere,
torus knot, particle globe, translucent faceted gem, flowing ribbon, dithered halftone sphere,
chrome/mirror sphere) — all rejected or unconfirmed, pure guess-and-check. Ran `/designflow`
grill-me to actually resolve direction before building attempt #9.

## Resolved direction

- **Root cause of rejections**: shape language read as generic/techy not premium-agency, motion
  timing felt off, and review was rushed (shipped before really looking).
- **Reference energy**: jeskojets.com — technical/precise, engineered.
- **3D role**: agent's call — atmospheric-but-cinematic (doesn't fight the headline, but motion
  itself carries the "precision instrument" feeling rather than being decorative).
- **Complexity**: a real 3D object (not a simple ambient/particle effect).
- **Explicit hard no**: no wireframe/line-based shapes. User: "I dont want wires I want something
  creative, a clean graphic."

## The concept

A large solid low-poly faceted form (bold facets, like a cut gem — but **opaque, flat-shaded**,
not translucent/wireframe like the earlier gem attempt). Each facet renders as one flat tone
(black/white/grey), hard edges between facets, zero gradient across a face. Reads like a bold
printed-poster graphic, not a technical line drawing or glass object.

Real 3D depth: true geometry + camera perspective, facets catch/lose light as the object rotates
— that motion is what sells the "3D-ness," not shading detail within a facet.

## Effects/motion (reusing proven plumbing from this session's other hero passes)

- Continuous slow multi-axis rotation, constant precise speed (no wobble/randomness)
- One directional light + low ambient — needed for flat-shading contrast (previous heroes were
  unlit `MeshBasicMaterial`; this is the first that needs real lighting)
- Mouse-parallax tilt (existing pattern)
- Scroll-zoom camera dolly (existing pattern)
- `scrollImpulse` flash/scale-pulse on scroll (existing shared signal every section reacts to)

## Explicitly ruled out (do not re-attempt blindly)

- Wireframe/line rendering of any kind
- Dither/halftone shader texture
- Mirror/chrome reflection (env map)
- Translucent glass material
- Points/particle field
- Tube/ribbon curves

## Constraints (standing, whole site)

- Monochrome: white/black/grey only, no other colors
- No lag — cheap per-frame cost
- Vanilla three.js via CDN import, no bundler/React
- No EffectComposer/float-render-target post-processing (real GPU-compat bug hit earlier with
  UnrealBloomPass/HalfFloatType — silently broken on real hardware despite working in testing)
