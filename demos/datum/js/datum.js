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

/* ──────────────────────────────────────────────────────── reveals */
(function () {
  'use strict';
  if (REDUCE || !('IntersectionObserver' in window)) return;
  var vh = innerHeight;
  var sels = ['.sec-h', '.sec-p', '.steps li', '.tbl', '.fleet-f', '.job-f',
              '.job-b p', '.job-d', '.calc-f', '.calc-o', '.bid-b p', '.f'];
  var items = [];
  sels.forEach(function (s) {
    [].forEach.call(document.querySelectorAll(s), function (el) {
      el.classList.add('rv'); items.push(el);
    });
  });
  [].forEach.call(document.querySelectorAll('[data-stagger]'), function (g) {
    items.push(g);
    [].forEach.call(g.children, function (c, i) { c.style.transitionDelay = (i * 0.055) + 's'; });
  });
  items.forEach(function (el) {
    if (el.getBoundingClientRect().top > vh * 0.92) el.classList.add('pre');
  });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.remove('pre');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach(function (el) { io.observe(el); });
})();

/* ──────────────────────────────────────────────────── mobile nav */
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

/* ─────────────────────────────────────── nav retract, action bar */
(function () {
  'use strict';
  if (REDUCE) return;
  var last = 0, t = false;
  var bar = document.getElementById('actionbar');
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
        var bid = document.getElementById('bid');
        var at = bid && bid.getBoundingClientRect().top < innerHeight * 0.92;
        bar.classList.toggle('up', y > innerHeight * 0.75 && !at
          && !document.body.classList.contains('locked'));
      }
    });
  }, { passive: true });
})();

/* ──────────────────────────────────────────────────────── failsafe */
setTimeout(function () {
  [].forEach.call(document.querySelectorAll('.pre'), function (el) { el.classList.remove('pre'); });
}, 3000);
