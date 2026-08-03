/* ═══════════════════════════════════════════════════════════════════
   DATUM — vanilla, no dependencies.

   The one real interaction is the estimator, which runs the same
   arithmetic as a takeoff: bank volume, swell, loads, and days for one
   36-tonne machine. It is genuinely useful, which is the only reason
   it is on the page.
   ═══════════════════════════════════════════════════════════════════ */

document.documentElement.classList.add('js');
var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ──────────────────────────────────────────────── the estimator */
(function () {
  'use strict';
  var f = document.getElementById('cf');
  if (!f) return;

  var L = document.getElementById('L'), W = document.getElementById('W'),
      D = document.getElementById('D'), S = document.getElementById('S');
  var oB = document.getElementById('oBank'), oL = document.getElementById('oLoose'),
      oT = document.getElementById('oTrucks'), oD = document.getElementById('oDays'),
      oN = document.getElementById('oNote');

  var TRUCK = 18;        // CY, end dump
  var DAY = 2600;        // bank CY a single 336 and a hauler string will move

  function n(el) { var v = parseFloat(el.value); return isFinite(v) && v > 0 ? v : 0; }
  function fmt(x) { return Math.round(x).toLocaleString('en-US'); }

  function run() {
    var bank = n(L) * n(W) * n(D) / 27;          // cubic feet → cubic yards
    var swell = parseFloat(S.value) || 1.25;
    var loose = bank * swell;
    var loads = Math.ceil(loose / TRUCK);
    var days = Math.max(1, Math.ceil(bank / DAY));

    oB.textContent = fmt(bank) + ' CY';
    oL.textContent = fmt(loose) + ' CY';
    oT.textContent = fmt(loads) + (loads === 1 ? ' load' : ' loads');
    oD.textContent = days + (days === 1 ? ' day' : ' days');

    // the note is where the honesty lives — the number alone would mislead
    if (!bank) {
      oN.textContent = 'Put some numbers in and it will do the rest.';
    } else if (n(D) > 12) {
      oN.textContent = 'Past twelve feet this stops being a dig and starts being shoring. Call us.';
    } else if (bank > 40000) {
      oN.textContent = 'At this size the haul distance matters more than the volume. The number above is the easy half.';
    } else {
      oN.textContent = 'Assumes haul under 15 miles, no rock, and somewhere legal to put it.';
    }
  }
  [L, W, D, S].forEach(function (el) {
    el.addEventListener('input', run); el.addEventListener('change', run);
  });
  f.addEventListener('submit', function (e) { e.preventDefault(); });
  run();
})();

/* ──────────────────────────────────────────────────── bid form */
(function () {
  'use strict';
  var form = document.getElementById('bidform');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var state = document.getElementById('state');
    var missing = [].slice.call(form.querySelectorAll('[required]'))
                    .filter(function (x) { return !x.value.trim(); });
    if (missing.length) { state.textContent = 'Name and email, then we can start.'; missing[0].focus(); return; }
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
  FX.boot({ anchorOffset: -92 });
  var soft = FX.reduce;

  /* Reduced motion is not "gentler motion" — it is none. Every reveal
     below is scroll-linked, and a scroll-linked tween that has not been
     triggered yet is just content held at opacity zero. So the whole
     choreography is skipped and the page renders as plain markup.
     FX.boot has already run, so in-page anchors still work. */
  if (soft) return;

  /* DATUM is mechanical. Stepped easing everywhere, nothing decelerates
     gently, hovers cut. A machine setting out a site, not a dissolve. */
  var STEP = 'steps(6)', SNAP = 0.42;

  var hero = document.querySelector('.hero-media img');
  if (hero) { FX.gl(hero, { grain: 0.02 }); FX.run(); }

  if (!soft) {
    var h1 = FX.split(document.querySelector('.hero-h'));
    if (h1) g.from(h1.lines, { yPercent: 105, duration: SNAP, ease: STEP, stagger: 0.07 });
    g.from('.hero-k', { opacity: 0, duration: 0.3, ease: STEP });
    g.from('.hero-d > div', { opacity: 0, duration: 0.35, ease: STEP, stagger: 0.05, delay: 0.4 });
  }

  /* the chalk lines snap, they do not draw */
  g.utils.toArray('.snap line').forEach(function (l, i) {
    var len = l.getTotalLength ? l.getTotalLength() : 1400;
    g.set(l, { strokeDasharray: len, strokeDashoffset: len });
    g.to(l, { strokeDashoffset: 0, duration: 0.55, ease: 'steps(8)', delay: 0.1 + i * 0.09 });
  });

  g.utils.toArray('.sec-h').forEach(function (h) {
    var s = FX.split(h);
    if (!s) return;
    g.from(s.lines, { yPercent: 105, duration: SNAP, ease: STEP, stagger: 0.06,
      scrollTrigger: { trigger: h, start: 'top 86%' } });
  });

  /* cells arrive as a wipe across the grid, left to right, in steps */
  g.utils.toArray('.cell').forEach(function (c, i) {
    g.from(c, { clipPath: 'inset(0 100% 0 0)', duration: 0.5, ease: STEP, delay: (i % 4) * 0.06,
      scrollTrigger: { trigger: c, start: 'top 92%' } });
  });
  g.utils.toArray('.steps li').forEach(function (c, i) {
    g.from(c, { clipPath: 'inset(0 0 100% 0)', duration: 0.45, ease: STEP, delay: (i % 5) * 0.05,
      scrollTrigger: { trigger: c, start: 'top 92%' } });
  });
  ['.tbl tbody tr', '.calc-o dl > div', '.job-d > div', '.f', '.cf-row'].forEach(function (sel) {
    g.utils.toArray(sel).forEach(function (el, i) {
      g.from(el, { opacity: 0, duration: 0.3, ease: STEP, delay: (i % 8) * 0.035,
        scrollTrigger: { trigger: el, start: 'top 95%' } });
    });
  });

  /* the estimator's numbers tick like a counter, not a tween */
  g.utils.toArray('.calc-o dd').forEach(function (dd) {
    ST.create({ trigger: dd, start: 'top 90%', once: true, onEnter: function () {
      var txt = dd.textContent, num = parseFloat(txt.replace(/[^\d.]/g, ''));
      if (!isFinite(num) || num < 4) return;
      var o = { n: 0 };
      g.to(o, { n: num, duration: 0.9, ease: 'steps(14)',
        onUpdate: function () { dd.textContent = txt.replace(/[\d,]+/, Math.round(o.n).toLocaleString('en-US')); },
        onComplete: function () { dd.textContent = txt; } });
    }});
  });

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
