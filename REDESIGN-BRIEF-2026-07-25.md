# /redesign — re-art brief

Decisions from the section-by-section grilling, 2026-07-25. Supersedes the open
questions in `HANDOFF-redesign-2026-07-25.md`. The hard-won rules in that file's
§3 still apply and are not up for renegotiation.

Branch `redesign-structure`. Preview https://redesign-structure.mvssolves.pages.dev/redesign/

---

## Locked decisions

| Area | Decision |
|---|---|
| Approach | **Patch in place.** No stylesheet rebuild, despite 20 `!important` and selectors redefined up to 6×. |
| Palette | Keep the Bone & Iris cream grounds. **Promote flare `#E4622F` to the primary active**; demote iris `#6650A8` to a support role. |
| Hero scene | **Scrap the 26k-point six-form morph.** Replace with one abstract sculptural form — real material, refraction, depth, moving light. |
| Hero shrink | Animate **`clip-path: inset()` + `border-radius`**, never `height/top/left/right`. |
| Hero process | **Three prototypes side by side**, judged live on the branch, then one is chosen. |
| Section flow | Radius 48–64px. Every seam and edge line removed. Grounds blend section to section. **The sticky cover-stack card motion stays.** |
| What I build | **Same six offerings. New copy, new layout.** Current cards read cheap and are all the same weight. |
| About | Copy stays as written. Layout and fitment only. Section must reach its CTA with no dead space under it. |
| Footer | **Match NeoLeaf**: pure `#000`, no white glow or dot field, 48px top radius, and a "Still have questions? → Send" block. |
| Scope | **All sections equally**, Proof and How it works included. |
| Motion lib | `animejs@4.5.0` installed. Static site has no bundler — must reach the browser via CDN or a vendored `dist` file. |

### Palette note
Pure `#000` in the footer is a deliberate exception to the "every neutral is warm"
rule the Bone & Iris system was built on. It will be the only cold surface on the page.

---

## Measured defects

All from live DOM measurement at a 1280×720 viewport. None depend on animation
frames, so none are artifacts of the throttled preview pane.

| # | Defect | Evidence |
|---|---|---|
| 1 | **Hero scene invisible at rest.** GSAP writes inline `height:0px` on `#hero3d` at scroll progress 0. Canvas is alive at 1280×720 CSS. First paint is a blank cream page. | `progress(0)` → `0px`; `progress(0.25)` → `678px`. Survives a forced `ScrollTrigger.refresh()` with `innerHeight` 720. Source: `index.html:2157`. |
| 2 | **Hero settles at the 220px floor.** `sceneH = max(220, innerH − copyH − 104)`; copy is 419px → 197 → clamps. The min is load-bearing, so the math is wrong. | `index.html:2142` |
| 3 | **Why me overflows its pin by 16px.** 664px section in a 648px pinned slot; 16px is unreachable. | Violates handoff §3.2. |
| 4 | **About leaves a 281px hole.** 367px section pinned in a 648px slot, so "What I build" stays visible underneath it. | `min-height:0!important` at `index.html:1341` on a `position:sticky` element. |
| 5 | **Footer gap.** `margin-top: 21.6px` exposes another strip of the section behind. | `index.html:1346` |
| 6 | **Seam drawn across the About CTA.** CTA occupies 276–323px; `seam-bot` spans 309–367px. | Injected seam, `index.html:2854`. |
| 7 | **Footer white glow.** `rgba(255,255,255,.16)` halftone dot field behind the wordmark, plus a white hairline on the top edge. | `index.html:858`, `index.html:1144` |

### Unverified
The About stat counters read `0 / 0 / 0` in the preview pane, but
`requestAnimationFrame` runs **0 frames/sec** there (`document.hidden === true`), so
the rAF-driven odometer cannot advance. Not proven broken — **check on a real screen.**
Markup targets are 100 websites, 6 businesses at 10K/mo, 10,000 automations/mo.

---

## Reference

NeoLeaf — https://neoleaf.bytetown.agency/ (ByteTown, Awwwards Honorable Mention, Mar 2025).

Their art is **produced, not procedural**: a 2560×1440 `intro.mp4` hero, a
2816×1536 product video, three feature videos, and rendered WebP artwork up to
3840px with separate dark-mode variants. Font is Onest. Palette is `#E6F536` lime
+ `#9070DF` violet on white — the exact two hexes this site used before the Bone &
Iris swap.

We are **not** matching their medium (decision: rebuild the WebGL scene as real
art). We are matching their **quality bar and footer**.

---

## Order of work

1. **Hero** — fix `height:0`, move the shrink to `clip-path`, fix the 220px clamp,
   then three sculpture prototypes.
2. **What I build** — new copy and layout for the same six offerings; kill the
   cheap card treatment and introduce real hierarchy.
3. **About + footer** — close the 281px hole and the 21.6px gap, lift the seam off
   the CTA, rebuild the footer to the NeoLeaf spec.
4. **Site-wide** — flare-led accents, 48–64px radii, every seam removed, grounds
   blended. Applied to Proof and How it works on the same terms as everything else.

## Still blocking

- **The contact endpoint has never sent an email.** `functions/api/contact.js` needs
  `RESEND_API_KEY` in the Cloudflare Pages env and the domain verified in Resend.
  This blocks the footer's "Send" block from being real.
- **Kling MCP is not authorised** — needs `/mcp` in an interactive terminal.
