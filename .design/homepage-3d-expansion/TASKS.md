# Homepage 3D + sound expansion

Skipped phases: grill-me, design-brief, IA, tokens — all already established (dark editorial brand, GSAP+Lenis+three.js wired, hero node-cluster scene shipped + verified lag-free). Straight to build.

Ground rule carried over from the hero scene (non-negotiable per section): renderer pauses via IntersectionObserver when its section is off-screen, capped pixel ratio, no per-frame O(n²) math, verify live (real console check + has-effect-class check) before moving to next task.

## Tasks

- [ ] 1. Capabilities section (`#capabilities`) — displaced wireframe grid/horizon plane behind headline. Distinct from hero (planar grid distortion, not a node cluster). Reinforces "workflow/systems" copy.
- [ ] 2. Pricing section (`#pricing`) — cursor-tilt 3D on tier cards (CSS 3D transform, no extra WebGL canvas — keeps total concurrent scene count low) + small ambient orbiting-ring accent in section background.
- [ ] 3. Book/closing section (`#book`) — orbiting ring + satellite spheres accent next to the copy, reinforcing "let's connect" literally (orbit = connection).
- [ ] 4. UI sound effects (Web Audio API, procedural, no asset files) — subtle tick on primary CTA hover/click, pricing toggle, hidden-cost wheel click. No scroll sound, no music. Shared AudioContext, resumes on first gesture (browser autoplay policy).

Each task: build → verify locally (console clean, effect toggles correctly, screenshot) → commit + push (bump `main.js?v=N`) → confirm live → next task.
