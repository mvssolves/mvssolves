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

/* ═══════════════════ the plans, drawn from the data ══════════════
   Not motion, so it runs whatever else fails. Every floor card gets
   its own plan and the 3D stage gets the full set to cross-fade
   through before — or instead of — the canvas.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var B = window.ICEHOUSE;
  if (!B) return;

  var stage = document.getElementById('b3plans');
  if (stage) {
    stage.innerHTML = B.floors.map(function (f) { return B.plan(f); }).join('');
    var first = stage.querySelector('.plan');
    if (first) first.classList.add('on');
  }

  [].forEach.call(document.querySelectorAll('.fl'), function (card) {
    var f = B.floors[+card.dataset.p];
    if (!f) return;
    var slot = document.createElement('div');
    slot.className = 'fl-plan';
    slot.setAttribute('aria-hidden', 'true');
    slot.innerHTML = B.plan(f);
    card.insertBefore(slot, card.firstChild);
  });
})();

/* ═══════════════════════ the arrival ════════════════════════════
   Deliberately NOT inside the motion block. That block returns early
   when GSAP has not loaded, and the veil is a fixed, opaque, full
   screen element — leaving it there behind a failed CDN would hide a
   perfectly working page completely. This owns lifting it, and the
   only dependency is fx.js itself.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var veil = document.getElementById('enter');
  if (!veil) return;
  if (!window.FX) { veil.remove(); return; }

  /* the indicator runs the lift down from the top floor to the street
     while the doors are still shut */
  var num = document.getElementById('eNum');
  if (num && !REDUCE) {
    var f = 7;
    var t = setInterval(function () {
      f--;
      if (f < 2 || !num.isConnected) { clearInterval(t); return; }
      num.textContent = f;
    }, 190);
  }

  FX.enter({ hold: 1150 });
  FX.links();
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
  /* the veil and the view-transition marking are handled above, so that
     they still happen if this block never runs */
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
  var cards = g.utils.toArray('.fl');
  /* scoped: every floor card now carries a .plan of its own, and those
     must never be caught by the stage's cross-fade */
  var plans = g.utils.toArray('#b3plans .plan');
  var btns = g.utils.toArray('.shaft button'), car = document.getElementById('car');
  var b3 = null;   /* the 3D building, once it has loaded */

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

    /* The cards snap between floors; the building does not. Feeding the
       model a fractional floor is what makes it read as a lift climbing
       rather than six slides being swapped. */
    function ride(self) {
      show(at(self));
      if (b3) b3.floor = g.utils.clamp(0, N - 1, self.progress * N - 0.5);
    }

    ST.create({
      trigger: lift, start: 'top top', end: 'bottom bottom', pin: stick, pinSpacing: false,
      onUpdate: ride,
      // leaving the ride in either direction parks it on a real floor, so
      // scrolling back above it can never strand an invisible card
      onLeaveBack: function () { show(0); if (b3) b3.floor = 0; },
      onLeave: function () { show(N - 1); if (b3) b3.floor = N - 1; },
      onRefresh: ride
    });

    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var i = +b.dataset.go, span = lift.offsetHeight - innerHeight;
        var y = lift.offsetTop + span * ((i + 0.5) / N);
        FX.lenis ? FX.lenis.scrollTo(y) : scrollTo({ top: y, behavior: 'smooth' });
      });
    });
  }

  /* ══════════════════ the phone deck ══════════════════════════════
     You cannot ride a building with one thumb, so on a phone the six
     floors are a swipe deck — and the model turns to whichever card is
     under it. Same building, different instrument. The shaft buttons
     drive the deck here rather than the page, which they previously did
     not do at all below 1000px. */
  var deck = document.querySelector('.cards');
  if (deck && matchMedia('(max-width:640px)').matches) {
    var deckAt = function () {
      var i = Math.round(deck.scrollLeft / (deck.scrollWidth / cards.length));
      return g.utils.clamp(0, cards.length - 1, i);
    };
    var syncDeck = function () {
      var i = deckAt();
      if (b3) b3.floor = g.utils.clamp(0, cards.length - 1,
        deck.scrollLeft / (deck.scrollWidth / cards.length));
      btns.forEach(function (b) { b.setAttribute('aria-current', String(+b.dataset.go === i)); });
    };
    deck.addEventListener('scroll', syncDeck, { passive: true });
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        deck.scrollTo({ left: (deck.scrollWidth / cards.length) * +b.dataset.go,
                        behavior: 'smooth' });
      });
    });
    syncDeck();
  }

  /* ══════════════════ mounting the building ═══════════════════════
     three.js is 2 MB. Nobody pays for it above the fold and nobody who
     never reaches the ride pays for it at all. Until it lands — or if
     it never does — the stage is a real drawn plan, so the section is
     never a hole in the page. */
  (function () {
    var stage = document.getElementById('b3');
    if (!stage || !('IntersectionObserver' in window)) return;
    if (!getComputedStyle(stage).display || getComputedStyle(stage).display === 'none') {
      /* the composition in play does not use the stage; the cards carry
         their own plans and nothing should be fetched */
      return;
    }
    var asked = false;
    new IntersectionObserver(function (es, io) {
      if (!es[0].isIntersecting || asked) return;
      asked = true; io.disconnect();
      import('./building.js')
        .then(function (m) { return m.mountBuilding(stage); })
        .then(function (h) {
          if (!h) return;
          b3 = h;
          ST.refresh();
          var hint = document.getElementById('b3hint');
          if (hint) { hint.hidden = false; g.from(hint, { opacity: 0, duration: .8 }); }
        })
        .catch(function () { /* the plan is already on screen */ });
    }, { rootMargin: '500px 0px' }).observe(stage);
  })();

  /* ══════════════════ the numbers count ═══════════════════════════
     Only in the hero, only once. A page where every figure spins is a
     page nobody believes. */
  g.utils.toArray('[data-count]').forEach(function (el) {
    var to = +el.dataset.count;
    var pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    var o = { v: 0 };
    g.to(o, {
      v: to, duration: 1.6, ease: 'power2.out', delay: 1.0,
      onUpdate: function () { el.textContent = pre + Math.round(o.v) + suf; }
    });
  });

  /* the timeline draws as you read it */
  var tl = document.querySelector('.tl');
  if (tl) g.to(tl, {
    '--rail': 1, ease: 'none',
    scrollTrigger: { trigger: tl, start: 'top 82%', end: 'bottom 72%', scrub: .6 }
  });

  /* the interlude: video, and the shader over it */
  var reelHost = document.querySelector('.reel-media');
  if (reelHost) {
    var reelImg = reelHost.querySelector('img');
    if (reelImg) FX.gl(reelImg, { grain: 0.035 });
    var rh = FX.split(document.querySelector('.reel-h'));
    if (rh) g.from(rh.lines, { yPercent: 118, duration: 1.35, ease: 'power3.out', stagger: .1,
      scrollTrigger: { trigger: '.reel', start: 'top 62%' } });
    g.from('.reel-k, .reel-p', { opacity: 0, y: 20, duration: 1, ease: 'power3.out', stagger: .08,
      scrollTrigger: { trigger: '.reel', start: 'top 62%' } });
    /* the frame drifts, so a held shot is never quite static */
    g.fromTo(reelHost, { yPercent: -4 }, { yPercent: 4, ease: 'none',
      scrollTrigger: { trigger: '.reel', start: 'top bottom', end: 'bottom top', scrub: 1 } });
  }

  /* the name comes up out of the floor */
  var fm = document.querySelector('.foot-m span');
  if (fm) g.from(fm, { yPercent: 105, duration: 1.4, ease: 'power3.out',
    scrollTrigger: { trigger: '.foot', start: 'top 88%' } });

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
