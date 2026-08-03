/* ═══════════════════════════════════════════════════════════════════
   ICEHOUSE — vanilla, no dependencies.

   The ride is scroll-DRIVEN, not scroll-hijacked, and the distinction
   is the whole point. Nothing here calls preventDefault on a wheel
   event. A tall section is pinned with position:sticky and its own
   scroll distance decides which floor you are on, which means:

     · the scrollbar never lies about where you are in the page
     · a fast flick still carries you straight past it
     · keyboard, trackpad, touch and a screen reader all behave
     · the shaft buttons jump by scrolling, so back/forward still work

   True hijacking would have been easier and would have trapped people.
   Below 1000px, and under prefers-reduced-motion, the whole thing is a
   plain stacked list with every floor visible at once.
   ═══════════════════════════════════════════════════════════════════ */

document.documentElement.classList.add('js');
var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ────────────────────────────────────────────── the floor journey */
(function () {
  'use strict';
  var lift = document.querySelector('.lift');
  var cards = [].slice.call(document.querySelectorAll('.fl'));
  var plans = [].slice.call(document.querySelectorAll('.plan'));
  var btns = [].slice.call(document.querySelectorAll('.shaft button'));
  var car = document.getElementById('car');
  if (!lift || cards.length < 2) return;

  var N = cards.length;
  var live = false, current = -1, ticking = false;

  function setFloor(i) {
    if (i === current) return;
    current = i;
    cards.forEach(function (c, n) { c.classList.toggle('on', n === i); });
    plans.forEach(function (p, n) { p.classList.toggle('on', n === i); });
    btns.forEach(function (b) {
      b.setAttribute('aria-current', String(+b.dataset.go === i));
    });
    if (car && btns.length) {
      // the shaft list runs top-down from the highest floor, so the car
      // sits at the inverse index — it rises as you rise
      var target = btns[N - 1 - i];
      if (target) {
        var top = target.offsetTop + target.offsetHeight / 2 - 3.5;
        car.style.transform = 'translateY(' + top + 'px)';
      }
    }
  }

  function run() {
    if (!live) return;
    var r = lift.getBoundingClientRect();
    var span = lift.offsetHeight - innerHeight;
    if (span <= 0) return;
    var p = Math.max(0, Math.min(0.9999, -r.top / span));
    setFloor(Math.floor(p * N));
  }

  function measure() {
    var wide = matchMedia('(min-width: 1000px)').matches;
    live = wide && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!live) {
      // hand every floor back, visible, in document order
      cards.forEach(function (c) { c.classList.remove('on'); });
      plans.forEach(function (p) { p.classList.remove('on'); });
      current = -1;
      return;
    }
    current = -1;
    run();
  }

  addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; run(); });
  }, { passive: true });
  addEventListener('resize', measure, { passive: true });

  // jumping a floor scrolls the page to it, so history and the
  // scrollbar stay honest rather than being bypassed
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var i = +b.dataset.go;
      var span = lift.offsetHeight - innerHeight;
      var y = lift.offsetTop + span * ((i + 0.5) / N);
      scrollTo({ top: y, behavior: REDUCE ? 'auto' : 'smooth' });
    });
  });

  measure();
})();

/* ───────────────────────────────────────────────── register form */
(function () {
  'use strict';
  var form = document.getElementById('regform');
  if (!form) return;
  var lv = document.getElementById('lv'), sum = document.getElementById('sum');
  var LEFT = { 'Level 2 — the loading floor': 1, 'Level 3': 2, 'Level 4': 3,
               'Level 5': 2, 'Level 6 — terraces': 3, 'Level 7 — under the tank': 2 };
  function write() {
    var n = LEFT[lv.value];
    sum.textContent = !lv.value ? 'Thirteen of twenty-eight left across all six floors.'
      : n === 1 ? 'One left on that floor. We will be straight with you if it goes.'
      : n + ' left on that floor.';
  }
  lv.addEventListener('change', write); write();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var state = document.getElementById('state');
    var missing = [].slice.call(form.querySelectorAll('[required]'))
                    .filter(function (x) { return !x.value.trim(); });
    if (missing.length) { state.textContent = 'Name and email is all we need.'; missing[0].focus(); return; }
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
  var sels = ['.sec-h', '.was-f', '.was-b p', '.tl li', '.spec-g article',
              '.reg-b p', '.f', '.hero-d>div'];
  var items = [];
  sels.forEach(function (s) {
    [].forEach.call(document.querySelectorAll(s), function (el) { el.classList.add('rv'); items.push(el); });
  });
  [].forEach.call(document.querySelectorAll('[data-stagger]'), function (g) {
    items.push(g);
    [].forEach.call(g.children, function (c, i) { c.style.transitionDelay = (i * 0.07) + 's'; });
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
  matchMedia('(min-width: 941px)').addEventListener('change', function (e) { if (e.matches && open) set(false); });
})();

/* ─────────────────────────────── nav retract, bar, parallax */
(function () {
  'use strict';
  if (REDUCE) return;
  var last = 0, t = false;
  var bar = document.getElementById('actionbar');
  var img = document.querySelector('.was-f img');
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
        var rg = document.getElementById('reg');
        var at = rg && rg.getBoundingClientRect().top < innerHeight * 0.92;
        bar.classList.toggle('up', y > innerHeight * 0.75 && !at
          && !document.body.classList.contains('locked'));
      }
      if (img) {
        var rr = img.getBoundingClientRect();
        var p = 1 - (rr.top + rr.height / 2) / (innerHeight / 2 + rr.height / 2);
        img.style.setProperty('--py', (p * -2.4).toFixed(2) + '%');
      }
    });
  }, { passive: true });
})();

/* ─────────────────────────────────────────────────────── failsafe */
setTimeout(function () {
  [].forEach.call(document.querySelectorAll('.pre'), function (el) { el.classList.remove('pre'); });
}, 3000);
