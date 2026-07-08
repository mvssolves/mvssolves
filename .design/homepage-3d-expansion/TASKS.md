# Homepage 3D + sound expansion

Skipped phases: grill-me, design-brief, IA, tokens — all already established (dark editorial brand, GSAP+Lenis+three.js wired, hero node-cluster scene shipped + verified lag-free). Straight to build.

Ground rule carried over from the hero scene (non-negotiable per section): renderer pauses via IntersectionObserver when its section is off-screen, capped pixel ratio, no per-frame O(n²) math, verify live (real console check + has-effect-class check) before moving to next task.

## Tasks

- [x] 1. Capabilities section (`#capabilities`) — displaced wireframe grid/horizon plane behind headline. Shipped `2ee1718`.
- [x] 2. Pricing section (`#pricing`) — cursor-tilt 3D on tier cards (CSS transform, no extra canvas) + orbiting-ring accent. Shipped `b74a4d0`.
- [x] 3. Book/closing section (`#book`) — single large rotating faceted polyhedron. Shipped `4ef6cbd`.
- [x] 4. UI sound effects (Web Audio API, procedural, no asset files) — click tick on primary CTAs, pricing toggle, hidden-cost wheel. Click-only (no hover — avoids trackpad-pass-through spam). Shared AudioContext, lazily created + resumed inside the click handler (satisfies autoplay policy). Shipped next commit.

Each task: build → verify locally (console clean, effect toggles correctly, screenshot) → commit + push (bump `main.js?v=N`) → confirm live → next task.
