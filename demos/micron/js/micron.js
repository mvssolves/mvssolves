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

/* ──────────────────────────────────────────────────────── reveals */
(function () {
  'use strict';
  if (REDUCE || !('IntersectionObserver' in window)) return;
  var vh = innerHeight;
  var sels = ['.sec-h', '.sec-p', '.reads>div', '.stages li', '.work-f', '.tier',
              '.shop-f', '.shop-b p', '.shop-d', '.book-b p', '.f', '.cost-h p'];
  var items = [];
  sels.forEach(function (s) {
    [].forEach.call(document.querySelectorAll(s), function (el) { el.classList.add('rv'); items.push(el); });
  });
  [].forEach.call(document.querySelectorAll('[data-stagger]'), function (g) {
    items.push(g);
    [].forEach.call(g.children, function (c, i) { c.style.transitionDelay = (i * 0.06) + 's'; });
  });
  items.forEach(function (el) { if (el.getBoundingClientRect().top > vh * 0.92) el.classList.add('pre'); });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.remove('pre'); io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach(function (el) { io.observe(el); });
})();

/* ───────────────────────────────────────────────────── mobile nav */
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
  }
  burger.addEventListener('click', function () { set(!open); });
  links.forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) set(false); });
  matchMedia('(min-width: 901px)').addEventListener('change', function (e) { if (e.matches && open) set(false); });
})();

/* ──────────────────────────────── nav retract, bar, parallax */
(function () {
  'use strict';
  if (REDUCE) return;
  var last = 0, t = false;
  var bar = document.getElementById('actionbar');
  var img = document.querySelector('.shop-f img');
  addEventListener('scroll', function () {
    if (t) return; t = true;
    requestAnimationFrame(function () {
      t = false;
      var y = scrollY;
      if (!document.body.classList.contains('locked')) {
        document.body.classList.toggle('nav-up', y > innerHeight * 0.6 && y > last + 4);
      }
      last = y;
      if (bar) {
        var bk = document.getElementById('book');
        var at = bk && bk.getBoundingClientRect().top < innerHeight * 0.92;
        bar.classList.toggle('up', y > innerHeight * 0.75 && !at
          && !document.body.classList.contains('locked'));
      }
      if (img) {
        var rr = img.getBoundingClientRect();
        var p = 1 - (rr.top + rr.height / 2) / (innerHeight / 2 + rr.height / 2);
        img.style.setProperty('--py', (p * -2.2).toFixed(2) + '%');
      }
    });
  }, { passive: true });
})();

/* ─────────────────────────────────────────────────────── failsafe */
setTimeout(function () {
  [].forEach.call(document.querySelectorAll('.pre'), function (el) { el.classList.remove('pre'); });
}, 3000);
