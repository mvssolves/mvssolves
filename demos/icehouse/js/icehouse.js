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

  /* ICEHOUSE is architectural: measured, weighty, nothing hurried.
     The ride is now a real pin with scrub, so the scrollbar and the
     building agree about where you are. */
  var EASE = 'power2.inOut';

  var heroHost = document.querySelector('.hero-media');
  var heroVid = FX.video(heroHost);
  var hero = heroHost && heroHost.querySelector('img');
  var layer = hero && FX.gl(hero, { grain: 0.03, video: heroVid });
  FX.run();
  if (layer) layer.reveal(2.0);

  if (!soft) {
    var h1 = FX.split(document.querySelector('.hero-h'));
    if (h1) g.from(h1.lines, { yPercent: 115, duration: 1.3, ease: 'power3.out', stagger: 0.1, delay: 0.15 });
    g.from('.hero-k, .hero-p, .hero .btn', { opacity: 0, y: 22, duration: 1, ease: 'power3.out', stagger: 0.09, delay: 0.5 });
    g.from('.hero-d > div', { opacity: 0, y: 18, duration: 0.9, ease: 'power3.out', stagger: 0.07, delay: 0.85 });
  }

  g.utils.toArray('.sec-h').forEach(function (h) {
    var s = FX.split(h);
    if (!s) return;
    g.from(s.lines, { yPercent: 115, duration: 1.2, ease: 'power3.out', stagger: 0.09,
      scrollTrigger: { trigger: h, start: 'top 86%' } });
  });

  /* the lift: pin the stage, scrub the floors, tween the car */
  var lift = document.querySelector('.lift'), stick = document.querySelector('.lift-stick');
  var cards = g.utils.toArray('.fl'), plans = g.utils.toArray('.plan');
  var btns = g.utils.toArray('.shaft button'), car = document.getElementById('car');

  if (lift && stick && cards.length && matchMedia('(min-width:1000px)').matches) {
    var N = cards.length, cur = 0;

    /* GSAP owns visibility from here. The CSS .on class exists only to
       keep the first floor visible between paint and boot; once this
       runs, inline autoAlpha is the single source of truth and the class
       is kept in step, so the two can never disagree about a floor. */
    function show(i) {
      if (i === cur) return;
      cur = i;
      cards.forEach(function (c, n) {
        c.classList.toggle('on', n === i);
        g.to(c, { autoAlpha: n === i ? 1 : 0, y: n === i ? 0 : 20,
                  duration: 0.55, ease: EASE, overwrite: true });
      });
      plans.forEach(function (p, n) {
        g.to(p, { autoAlpha: n === i ? 1 : 0, duration: 0.5, overwrite: true });
      });
      btns.forEach(function (b) { b.setAttribute('aria-current', String(+b.dataset.go === i)); });
      var t = btns[N - 1 - i];
      if (car && t) g.to(car, { y: t.offsetTop + t.offsetHeight / 2 - 3.5, duration: 0.6, ease: EASE });
    }

    g.set(cards, { autoAlpha: 0, y: 20 });
    g.set(cards[0], { autoAlpha: 1, y: 0 });
    g.set(plans.slice(1), { autoAlpha: 0 });

    function at(self) { return Math.min(N - 1, Math.floor(self.progress * N)); }

    ST.create({
      trigger: lift, start: 'top top', end: 'bottom bottom', pin: stick, pinSpacing: false,
      onUpdate: function (self) { show(at(self)); },
      // leaving the ride in either direction parks it on a real floor, so
      // scrolling back above it can never strand an invisible card
      onLeaveBack: function () { show(0); },
      onLeave: function () { show(N - 1); },
      onRefresh: function (self) { show(at(self)); }
    });

    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var i = +b.dataset.go, span = lift.offsetHeight - innerHeight;
        var y = lift.offsetTop + span * ((i + 0.5) / N);
        FX.lenis ? FX.lenis.scrollTo(y) : scrollTo({ top: y, behavior: 'smooth' });
      });
    });
  }

  var wasImg = document.querySelector('.was-f img');
  if (wasImg && !soft) {
    FX.gl(wasImg, { grain: 0.03 });
    g.fromTo(wasImg, { yPercent: -6 }, { yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: wasImg, start: 'top bottom', end: 'bottom top', scrub: 1 } });
  }
  ['.was-b p', '.tl li', '.spec-g article', '.reg-b p', '.f'].forEach(function (sel) {
    g.utils.toArray(sel).forEach(function (el, i) {
      g.from(el, { opacity: 0, y: 20, duration: 1.05, ease: 'power3.out', delay: (i % 5) * 0.06,
        scrollTrigger: { trigger: el, start: 'top 92%' } });
    });
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
