/* ═══════════════════════════════════════════════════════════════════
   MICRON — vanilla, no dependencies.

   The risk on this build is the defect map: the four things a paint
   inspector actually looks for, drawn over the hero photograph and
   filterable by type. Every mark is generated from a seeded PRNG, so
   the map is identical on every load and on every device — a detail
   that matters, because a map that reshuffled itself would be
   admitting it was decoration.

   The photograph is the content. The map is an enhancement layered on
   top of it, so with JavaScript off you lose the overlay and keep the
   panel.
   ═══════════════════════════════════════════════════════════════════ */

document.documentElement.classList.add('js');
var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─────────────────────────────────────────────────── the defect map */
(function () {
  'use strict';
  var svg = document.getElementById('defects');
  if (!svg) return;

  // mulberry32 — small, fast, and the same sequence every time
  function prng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var r = prng(20260802);
  var W = 1000, H = 620, NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function group(cls) {
    var g = el('g', { 'data-d': cls });
    svg.appendChild(g);
    return g;
  }

  // ── swirl marks: dense short arcs, the halo left by a wash mitt
  var g = group('swirl');
  for (var i = 0; i < 260; i++) {
    var cx = r() * W, cy = r() * H;
    var rad = 4 + r() * 16;
    var a0 = r() * 6.28, a1 = a0 + 1.1 + r() * 2.2;
    var x0 = cx + Math.cos(a0) * rad, y0 = cy + Math.sin(a0) * rad;
    var x1 = cx + Math.cos(a1) * rad, y1 = cy + Math.sin(a1) * rad;
    g.appendChild(el('path', {
      d: 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'A' + rad.toFixed(1) + ' ' + rad.toFixed(1) +
         ' 0 0 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1),
      fill: 'none', stroke: '#fff', 'stroke-width': 0.7,
      opacity: (0.18 + r() * 0.32).toFixed(2)
    }));
  }

  // ── random deep scratches: long, straight, and the ones that don't polish out
  g = group('rids');
  for (i = 0; i < 22; i++) {
    var sx = r() * W, sy = r() * H;
    var ang = (r() - 0.5) * 2.2, len = 40 + r() * 190;
    g.appendChild(el('line', {
      x1: sx.toFixed(1), y1: sy.toFixed(1),
      x2: (sx + Math.cos(ang) * len).toFixed(1), y2: (sy + Math.sin(ang) * len).toFixed(1),
      stroke: '#fff', 'stroke-width': (0.9 + r() * 0.8).toFixed(1),
      opacity: (0.4 + r() * 0.35).toFixed(2)
    }));
  }

  // ── water etching: irregular rings where minerals sat and dried
  g = group('etch');
  for (i = 0; i < 26; i++) {
    var ex = r() * W, ey = r() * H, er = 8 + r() * 26;
    g.appendChild(el('ellipse', {
      cx: ex.toFixed(1), cy: ey.toFixed(1),
      rx: er.toFixed(1), ry: (er * (0.55 + r() * 0.5)).toFixed(1),
      transform: 'rotate(' + (r() * 180).toFixed(0) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1) + ')',
      fill: 'none', stroke: '#e8ffb0', 'stroke-width': 1.1,
      opacity: (0.22 + r() * 0.3).toFixed(2)
    }));
  }

  // ── buffer trails: long parallel curves, somebody else's correction
  g = group('buff');
  for (i = 0; i < 14; i++) {
    var by = r() * H, bx = r() * W * 0.6;
    var d = 'M' + bx.toFixed(1) + ' ' + by.toFixed(1);
    for (var k = 1; k <= 3; k++) {
      d += ' Q' + (bx + k * 110).toFixed(1) + ' ' + (by + (r() - 0.5) * 40).toFixed(1) +
           ' ' + (bx + k * 150).toFixed(1) + ' ' + (by + (r() - 0.5) * 18).toFixed(1);
    }
    g.appendChild(el('path', {
      d: d, fill: 'none', stroke: '#fff', 'stroke-width': 2.6,
      opacity: (0.10 + r() * 0.13).toFixed(2)
    }));
  }

  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

  /* ── the lamp. The panel does not change; the light on it does. */
  var lamp = document.getElementById('lamp');
  var note = document.getElementById('lampNote');
  var COPY = {
    off: 'That panel looks clean in daylight. Most of them do.',
    on: 'Same panel, 6500K at a low angle. Nothing was added — this was always there.'
  };
  if (lamp) {
    lamp.addEventListener('click', function () {
      var on = lamp.getAttribute('aria-pressed') !== 'true';
      lamp.setAttribute('aria-pressed', String(on));
      lamp.textContent = on ? 'Turn the inspection light off' : 'Turn on the inspection light';
      document.body.classList.toggle('lamp-on', on);
      if (note) note.textContent = on ? COPY.on : COPY.off;
    });
  }

  /* ── defect-type filters */
  [].forEach.call(document.querySelectorAll('.tog'), function (b) {
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      var grp = svg.querySelector('[data-d="' + b.dataset.d + '"]');
      if (grp) grp.style.display = on ? '' : 'none';
      // filtering implies you want the lamp on; turn it on rather than
      // leaving someone toggling an invisible overlay
      if (on && lamp && lamp.getAttribute('aria-pressed') !== 'true') lamp.click();
    });
  });
})();

/* ────────────────────────────────────────────────── inspection form */
(function () {
  'use strict';
  var form = document.getElementById('booking');
  if (!form) return;
  var hs = document.getElementById('hs'), sum = document.getElementById('sum');
  var NOTE = {
    'Not that I know of': 'Good. Original paint gives us the most to work with.',
    'Yes, by a shop': 'Then the reading matters more. Previous passes have already taken material.',
    'Yes, by me': 'No judgement. It just changes where we start the test spot.',
    'It was, and it went badly': 'This is most of what we do. Bring it in before anyone else touches it.'
  };
  function write() { sum.textContent = NOTE[hs.value] || ''; }
  hs.addEventListener('change', write); write();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var state = document.getElementById('state');
    var missing = [].slice.call(form.querySelectorAll('[required]'))
                    .filter(function (x) { return !x.value.trim(); });
    if (missing.length) { state.textContent = 'Name and email, then we can book you in.'; missing[0].focus(); return; }
    var em = document.getElementById('em');
    if (em.value.indexOf('@') < 1 || em.value.indexOf('.') < 0) {
      state.textContent = 'That email will not reach you.'; em.focus(); return;
    }
    state.textContent = 'Demo build — no endpoint wired. Nothing was sent.';
  });
})();

/* ══════════════════════════ motion ══════════════════════════════
   GSAP + ScrollTrigger + Lenis, with this build's own choreography.
   The engine is shared (../lib/fx.js); none of the timing, easing or
   sequencing below is. That is the whole point of the library.

   If GSAP fails to load, nothing is left hidden — the guard at the
   bottom of this block hands the page back as plain markup.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var g = window.gsap, ST = window.ScrollTrigger;
  if (!g || !ST || !window.FX) { return; }
  FX.enter();
  FX.links();
  FX.boot({ anchorOffset: -92 });
  var soft = FX.reduce;

  /* Reduced motion is not "gentler motion" — it is none. Every reveal
     below is scroll-linked, and a scroll-linked tween that has not been
     triggered yet is just content held at opacity zero. So the whole
     choreography is skipped and the page renders as plain markup.
     FX.boot has already run, so in-page anchors still work. */
  if (soft) return;

  /* MICRON is precise. Short durations, no overshoot, nothing bounces.
     A measuring instrument, not a showreel. */
  var EASE = 'power2.out', D = 0.62;

  var heroHost = document.querySelector('.hero-media');
  var heroVid = FX.video(heroHost);
  var hero = heroHost && heroHost.querySelector('img');
  if (hero) { FX.gl(hero, { grain: 0.03, video: heroVid }); FX.run(); }

  if (!soft) {
    var h1 = FX.split(document.querySelector('.hero-h'));
    if (h1) g.from(h1.lines, { yPercent: 110, duration: 0.8, ease: EASE, stagger: 0.07 });
    g.from('.hero-p, .hero-act, .hero-n', { opacity: 0, y: 14, duration: D, ease: EASE, stagger: 0.07, delay: 0.35 });
  }

  g.utils.toArray('.sec-h').forEach(function (h) {
    var s = FX.split(h);
    if (!s) return;
    g.from(s.lines, { yPercent: 110, duration: 0.8, ease: EASE, stagger: 0.07,
      scrollTrigger: { trigger: h, start: 'top 86%' } });
  });

  /* the readings count up, because they are readings */
  g.utils.toArray('.reads dd').forEach(function (dd) {
    if (dd.classList.contains('sub')) return;
    ST.create({ trigger: dd, start: 'top 90%', once: true, onEnter: function () {
      var unit = dd.querySelector('span'), target = parseFloat(dd.textContent);
      if (!isFinite(target)) return;
      var dec = (String(target).split('.')[1] || '').length;
      var o = { n: 0 };
      g.to(o, { n: target, duration: 1.1, ease: EASE, onUpdate: function () {
        dd.firstChild.nodeValue = o.n.toFixed(dec) + ' ';
      }, onComplete: function () { dd.firstChild.nodeValue = target.toFixed(dec) + ' '; } });
    }});
  });

  ['.stages li', '.tier', '.shop-d > div', '.f', '.sec-p', '.cost-h p', '.shop-b p', '.tog'].forEach(function (sel) {
    g.utils.toArray(sel).forEach(function (el, i) {
      g.from(el, { opacity: 0, y: 16, duration: D, ease: EASE, delay: (i % 5) * 0.05,
        scrollTrigger: { trigger: el, start: 'top 92%' } });
    });
  });

  var shopImg = document.querySelector('.shop-f img');
  if (shopImg && !soft) {
    FX.gl(shopImg, { grain: 0.03 });
    g.fromTo(shopImg, { yPercent: -4 }, { yPercent: 4, ease: 'none',
      scrollTrigger: { trigger: shopImg, start: 'top bottom', end: 'bottom top', scrub: 1 } });
  }

})();

/* If the engine never arrived, nothing may stay hidden. */
setTimeout(function () {
  if (!window.gsap) {
    [].forEach.call(document.querySelectorAll('[data-fx]'), function (el) {
      el.style.opacity = 1; el.style.transform = 'none'; el.style.clipPath = 'none';
    });
  }
}, 2500);

/* ───────────────────────────────────────────────────── mobile nav
   Not motion — this has to work whether or not GSAP loaded. */
(function () {
  'use strict';
  var burger = document.getElementById('burger'), mnav = document.getElementById('mnav');
  if (!burger || !mnav) return;
  var links = [].slice.call(mnav.querySelectorAll('a'));
  var open = false;
  function set(next) {
    open = next;
    burger.setAttribute('aria-expanded', String(open));
    mnav.classList.toggle('open', open);
    document.body.classList.toggle('locked', open);
    if (window.FX && FX.lenis) { open ? FX.lenis.stop() : FX.lenis.start(); }
  }
  burger.addEventListener('click', function () { set(!open); });
  links.forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) set(false); });
  matchMedia('(min-width: 901px)').addEventListener('change', function (e) { if (e.matches && open) set(false); });
})();

/* ══════════════════ the panel, in 3D ═══════════════════════════════
   three.js is 2 MB raw. Nobody pays for it above the fold, and nobody
   who never scrolls this far pays for it at all — the module is only
   fetched once the section is close, and the section is a real
   photograph with working controls until it arrives.
   ═════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var stage = document.getElementById('p3stage');
  var slider = document.getElementById('mic');
  var out = document.getElementById('micOut');
  var note = document.getElementById('micNote');
  if (!stage || !slider) return;

  /* The readout and the copy work with or without the render, so the
     section is never dead weight while three.js is still in flight. */
  function say(v) {
    out.textContent = v + ' \u00b5m';
    note.textContent =
      v >= 42 ? 'Healthy. This is roughly what a well-kept car reads.'
    : v >= 36 ? 'One correction has been done here, or the car has been washed badly for years.'
    : v >= 30 ? 'Two corrections in. We would do a one-step at most from here.'
    : v >= 25 ? 'Thin. A test spot decides it, and the answer is often no.'
    : 'Under 25. There is nothing safe left to cut, and we would refuse the job.';
  }
  var handle = null;
  slider.addEventListener('input', function () {
    var v = +slider.value;
    say(v);
    if (handle) handle.microns = v;
  });
  say(+slider.value);

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  // dynamic import needs module support; older browsers keep the photograph
  if (!('IntersectionObserver' in window)) return;

  var asked = false;
  new IntersectionObserver(function (es, io) {
    if (!es[0].isIntersecting || asked) return;
    asked = true; io.disconnect();
    import('./panel.js')
      .then(function (m) { return m.mountPanel(stage); })
      .then(function (h) { if (h) { handle = h; handle.microns = +slider.value; } })
      .catch(function () { /* the photograph is already there */ });
  }, { rootMargin: '400px 0px' }).observe(stage);
})();
