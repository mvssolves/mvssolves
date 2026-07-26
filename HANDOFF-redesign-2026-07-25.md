# Handoff — mvssolves.com `/redesign` — 2026-07-25

**Read this before touching anything.** Written at the end of a long session that
went badly in places. The section "Rules learned the hard way" is the important
part — two of those mistakes were made three times each.

---

## 1. Where things are

| | |
|---|---|
| Repo | `github.com/mvssolves/mvssolves` |
| Working branch | `redesign-structure` |
| HEAD at handoff | `4479ffa` |
| Live preview (phone-viewable) | https://redesign-structure.mvssolves.pages.dev/redesign/ |
| Production | `mvssolves.com` — **untouched**, `main` is at `cca5ac5`. `/redesign` 404s there by design. |
| Local dev | `cd "04 Web Projects/mvssolves.com" && python3 -m http.server 8940` → `localhost:8940/redesign/` |

Cloudflare Pages is git-connected. **Every push to `redesign-structure` auto-deploys
the preview URL.** Pushing to `main` deploys production — do not do that without
Martin explicitly asking.

### Files that matter
```
redesign/index.html      the whole page — inline <style> and inline <script>, ~2500 lines
redesign/hero-scene.js   the WebGL hero (26k points, six forms). Loaded as ?v=5
redesign/hero-order.js   an older particle hero. NOT loaded. Left in place deliberately.
redesign/subpage.css     shared styles for the 9 legal/FAQ subpages
redesign/<9 dirs>/       privacy-policy, terms-of-service, acceptable-use-policy,
                         data-processing-agreement, security, accessibility-statement,
                         faq, join-the-team, contact
functions/api/contact.js Cloudflare Function → Resend. NEVER TESTED. See §6.
```

---

## 2. Architecture — how the page works

**The sticky cover-stack is the site's signature and is non-negotiable.** Martin
defended it repeatedly and reverted a session's work when it was removed.

```
.hero-block      225vh runway containing an inner position:sticky viewport.
                 A GSAP ScrollTrigger scrubs #hero3d from fullscreen to an inset card.
#proof           sticky, top:var(--nav-h), min-height:calc(100dvh - nav), z-index 2
#process         same, z-index 3
#why             same, z-index 4
#services        same, z-index 5
.team-block      same, z-index 6   (min-height dropped — sized to content)
footer           relative, z-index 7, margin-top ~27px (deliberate "loose" gap)
```

Each section is a rounded-top card that slides UP OVER the previous one. Radius
`32px 32px 0 0`.

**Below 760px the stack is relaxed to normal flow** — every section overflowed a
one-viewport pin on a phone (Work by 611px at the time), which made content
literally unreachable. Mobile keeps the rounded top and a `-26px` tuck so the
layered *look* survives without the layering *motion*.

### Motion
- Text reveals are driven by **IntersectionObserver, never ScrollTrigger**.
  ScrollTrigger computes from an element's *natural* document position, and every
  section is sticky, so it fires at the wrong moment. This is documented in the
  file and was re-learned the hard way.
- `replayIn()` is the shared reveal harness. **It uses `threshold:0`** — see §3.
- Per-character rise (`fxRise`) is the house effect for headings and body copy.
- Lenis for smooth scroll, wired to GSAP's ticker.

---

## 3. Rules learned the hard way — READ THESE

### 3.1 Never declare `position` on a cover-stack section
This broke the site **three separate times** in one session.

The shared rule sets `top:var(--nav-h)`. That is inert on a `sticky` element. On a
`relative` one it shifts the box **72px down its own flow position**, opening a gap
that shows the layer behind it. Martin called this "a hole in the site".

Offenders that caused it: `.team-block{position:relative}` (added for a background),
`#services{position:relative}` (added for a plinth), and a seam rule that declared
`position:relative` on **all five layers at once**, killing the entire stack.

`position:sticky` already establishes a containing block for absolutely positioned
children. **If you need `overflow` or a `::before`, declare only that.**

### 3.2 Content must fit inside its pin
A sticky section taller than one viewport cannot be fully scrolled — the overflow is
unreachable. Work was `1151px inside an 828px pin` (323px invisible). Always measure:

```js
// content bottom relative to section top, vs (viewportH - navH)
```
There is a ready-made probe pattern in the session: build a `_v.html` that iframes
`/redesign/index.html`, waits ~2.6s, measures, and writes JSON into `document.title`,
then read it with `chrome --headless --dump-dom | grep '<title>'`.

### 3.3 `splitChars()` destroys inline markup
It rebuilds an element from `textContent`. Any `<em>`, `<b>` or `<span class="hl">`
inside a heading is thrown away. Two workarounds already in the file:
- `data-hl="word,word"` → re-applied by `applyHl()` to word wrappers
- `data-em="word"` → re-applied in the hero intro

Also: chars are grouped in **nowrap word wrappers**. Bare inline-block characters
give the browser a break opportunity between every letter and the headline wraps
mid-word ("systems that o / nly win").

### 3.4 `grid-template-rows:0fr` sizes only the FIRST row
For an expand/collapse, all content must be in **one** child. Three direct children
= two extra implicit auto rows = "collapsed" stays full height.

### 3.5 Reveal gating
`replayIn` fires at `threshold:0`. Inside the sticky stack an element intersects the
viewport **while still covered by the section above it** — so it reveals and animates
off-screen, then re-fires and replays over already-visible text. Martin described it
as "comes up too soon and then runs its transition".

Fix pattern (used on Proof's tab copy): a dedicated observer requiring **45%+
visibility**, re-armed only after the element fully leaves. Hero figures additionally
require `scrollY > 60`, because the hero is on screen at load.

### 3.6 Verification limits in this environment
- Headless Chrome barely advances `requestAnimationFrame` — the hero clock reached
  **0.09s over a 12-second capture**. GSAP/three.js animations will look frozen. You
  can verify *wiring*, not motion.
- An iframe redefines `vh`, so a tall iframe makes `100vh` sections enormous. Measure
  in a 900px-tall iframe, screenshot differently.
- The browser pane, when backgrounded, throttles rAF and reports `viewport 0`.
- **Say so when you cannot verify something visually.** Do not imply you saw it.

---

## 4. Design system — Bone & Iris

Adopted this session, replacing violet `#9070DF` + acid lime `#E6F536`.

```css
--paper:#F7F4EF        /* default light surface. #FFFFFF is a RAISED state */
--paper-raised:#FFFFFF
--bone:#EFE9DF         --line:#DDD6C8
--ink:#16130F          --ink-raised:#221E18   --line-dark:#332D24
--text:#2E2A24         --text-muted:#6B655B   --text-invert:#EFEAE1
--accent:#6650A8       /* iris — buttons, active states */
--accent-deep:#4C3D7D  --accent-lift:#9F8AD9  /* -lift is for DARK backgrounds only */
--flare:#E4622F        /* send / win / booked. RARE. */
```

**Two hard rules:**
1. Every neutral is warm. **No cool grey anywhere.** Shadows tuned against pure white
   go grey and dirty on `#F7F4EF` — retint them.
2. **Violet appears in ZERO gradients**, CSS or WebGL. A two-colour lerp across
   thousands of particles *is* a gradient — that is why the hero field is warm
   graphite dust with a fixed 1-in-7 iris minority.

**Flare rules:** max one per viewport, never a CTA, never a link on light. It marks
"something happened".

**Typeface:** Satoshi (Fontshare), preloaded, with the old system stack as fallback.
Applied to `subpage.css` too so the legal pages don't split typographically.

### Palette-swap gotcha
The first swap missed ~30 hexes and they were **concentrated in whole components** —
the entire Systems isometric scene and the footer wordmark still rendered in the old
violet ramp. Martin saw it as "sections don't have the same colors". If you change
palette again, grep for every hex, and remap **by role** (each isometric stop keeps
its relative value so the 3D shading survives) rather than find-and-replace.

---

## 5. What Martin has rejected — do not re-propose

Nine hero attempts died: a metal blob, a "Caught" film, a dot-mesh, a six-form scene
(later restored at his request), a multi-scene journey, a DOM card collage, particle
typography spelling the stats, parametric sculptures, and a flat particle field.

He also **reverted an entire flat-architecture + accordion rebuild** (`c9c9527`). The
brief was "match this reference exactly", which was read as license to remove the
cover-stack. That was the wrong call — the stack is load-bearing to him.

**Ask before removing anything structural, even when a brief seems to authorise it.**

### Standing preferences
- Terse, decisive. One recommendation, not three.
- Hates anything that reads as generic AI output, tacky, or low quality.
- Motion must be purposeful and *mean* something, not decorate.
- Buttons must **not** move — hover/click effects only. A magnetic CTA was rejected.
- Nav links hover **ink**, not lime, not violet. **No rule under the nav.**
- Copy: outcome-led, sentence case, no exclamation marks.

---

## 6. Open items

### Blocking
1. **The contact endpoint has never sent an email.** `functions/api/contact.js` needs
   `RESEND_API_KEY` in Cloudflare Pages env vars **and** the domain verified in Resend.
   Until then every form on the site silently fails. Do this before building more forms.
2. **Kling MCP is not authorised.** Needed for AI imagery. Authorise via `/mcp` in an
   interactive terminal — it cannot be done from a non-interactive session.

### Decisions waiting on Martin
- **Contact form structure.** Proposal: keep the 3-field modal for impulse enquiries;
  make `/contact` a multi-step brief (You → business → what you need → *"what's
  actually broken?"* → budget range + timeline → anything else). Three open questions:
  include a budget field (rec: yes, as ranges), multi-step vs one long page (rec:
  multi-step), and where submissions land (email only / + sheet / + contacts DB).
- `"The business in one prompt."` — the About heading. Doesn't land for a visitor.
  Suggested `"One person. Every project."`
- Footer says **"Remote"**. He's in Brea, California now. He previously asked for
  "Remote" explicitly, so it was left.

### Known imperfect
- **Mobile has never been seen on a device** — only measured. At 390×844: sections
  static, content 351px inside 390px, gutters 19.5px, nav fits, zero overflow.
  A mobile-only sticky thumb bar appears after the hero and hides over the footer.
- The reference's **dark full-width feature cards** (one wide + two half), the fixed
  vertical side badge, and the two-tone headline fill were never built.
- Work section has ~190px of empty space below its single row of cards.
- `hero-order.js` is dead code. Left deliberately in case he asks for that field back.

---

## 7. Session commit log (newest first)

```
4479ffa full-bleed width, Work fits its pin, About ends at its CTA
0ed1b23 un-join Why-me and Work, close the 72px gap, clean About overrides
c9c9527 REVERT the flat-architecture and accordion rebuild
dd79a65 (reverted) The work becomes the reference accordion
c61be7c (reverted) kill the sticky cover-stack — flat full-bleed sections
08d89f2 close the hole, restore the original scene, seamless seams
4b89abd restore Why-me height, unclip the ghost, mirror The work
69e9c68 Work lead matched to six offerings
c145cab merge Why-me + Work into one surface, six offerings, gutter rails
22bb47d nine fixes — status pill out, unified grounds, depth, motion corrections
a69af35 fix invalid --line token
900a5f4 purpose-built mobile layout
41ae361 hero becomes a display section; no rule under the nav
a46b786 colour-consistency sweep + material polish pass
caca07c mobile build + About/footer rebalance
44710d9 adopt the Bone & Iris palette
7919bfd design audit pass — real typeface, container cap, a11y landmarks
```

A design hook also caught a genuine bug worth remembering: `--line` was set to
`#DDD6C86C8` — **nine hex digits, invalid** — so every `border:1px solid var(--line)`
on the site was silently falling back to `currentColor`. Fixed in `a69af35`.

---

## 8. If you are the next agent

1. Do not touch `main`.
2. Read §3 before writing any CSS on a section.
3. Measure before and after; do not claim a visual result you could not see.
4. When a brief conflicts with existing architecture, **ask** — do not choose.
5. Small commits with a real explanation of *why*, not just *what*.
