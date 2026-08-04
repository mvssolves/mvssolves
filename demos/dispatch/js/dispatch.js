/* ═══════════════════════════════════════════════════════════════════
   DISPATCH — vanilla, no dependencies.

   The board is real logic, not a decorative ticker. It reads the
   visitor's own clock and works out the genuine state of the day:
   which slots are gone, what the next one is, whether the after-hours
   rate now applies, and how many trucks would plausibly be out at this
   hour on this day of the week.

   Truck count is derived from the hour and the weekday, not randomised
   — a number that reshuffled on refresh would be a lie, and this is a
   page whose whole argument is that it doesn't tell them.
   ═══════════════════════════════════════════════════════════════════ */

document.documentElement.classList.add('js');
var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ────────────────────────────────────────────────────── the board */
(function () {
  'use strict';
  var vNext = document.getElementById('vNext'), sNext = document.getElementById('sNext'),
      vTrucks = document.getElementById('vTrucks'), sTrucks = document.getElementById('sTrucks'),
      vClock = document.getElementById('vClock'), vFee = document.getElementById('vFee'),
      sFee = document.getElementById('sFee'), barNext = document.getElementById('barNext'),
      note = document.getElementById('boardNote');
  if (!vNext) return;

  var OPEN = 7, CLOSE = 21;          // 7am–9pm, seven days
  var AFTER = 18;                    // after-hours rate from 6pm
  var FLEET = 6;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function label(h, m) {
    var ap = h >= 12 ? 'pm' : 'am';
    var hh = h % 12 || 12;
    return hh + ':' + pad(m) + ap;
  }

  function draw() {
    var now = new Date();
    var h = now.getHours(), m = now.getMinutes(), dow = now.getDay();

    vClock.textContent = label(h, m);

    // ── next slot: on the hour and half hour, first one at least 45 min out
    var mins = h * 60 + m + 45;
    var slot = Math.ceil(mins / 30) * 30;
    var sh = Math.floor(slot / 60), sm = slot % 60;

    if (h < OPEN) {
      vNext.textContent = label(OPEN, 30);
      sNext.textContent = 'first slot this morning';
    } else if (sh >= CLOSE) {
      vNext.textContent = label(OPEN, 30);
      sNext.textContent = 'tomorrow — the phone still wakes someone tonight';
    } else {
      vNext.textContent = label(sh, sm);
      sNext.textContent = sh - h < 2 ? 'today, about ' + (slot - (h * 60 + m)) + ' minutes out'
                                     : 'today';
    }

    // ── trucks out: a real curve over the working day, weekends lighter.
    //    Deterministic from the clock, so it never contradicts itself.
    var out = 0;
    if (h >= OPEN && h < CLOSE) {
      var peak = 1 - Math.abs((h + m / 60) - 13) / 7;      // busiest early afternoon
      out = Math.round(FLEET * Math.max(0.18, peak) * (dow === 0 || dow === 6 ? 0.55 : 1));
      out = Math.max(1, Math.min(FLEET, out));
    }
    vTrucks.textContent = out;
    sTrucks.textContent = out === 0 ? 'of 6 — depot closed, phone open'
      : out === FLEET ? 'of 6 — all out, still taking calls' : 'of 6';

    // ── the fee actually changes after 6pm and at weekends, so say so
    var afterHours = h >= AFTER || h < OPEN || dow === 0 || dow === 6;
    vFee.textContent = afterHours ? '$149' : '$89';
    sFee.textContent = afterHours
      ? (dow === 0 || dow === 6 ? 'weekend diagnostic, off the bill if you book the work'
                                : 'after 6pm, off the bill if you book the work')
      : 'diagnostic, off the bill if you book the work';

    if (barNext) barNext.textContent = vNext.textContent;
    if (note) {
      note.textContent = h >= CLOSE || h < OPEN
        ? 'Out of hours. The board reads your own clock — the number still rings a person for a genuine emergency.'
        : 'The board reads your own clock. Nothing here is a stock photo of a van.';
    }
  }

  draw();
  setInterval(draw, 30000);
})();

/* ─────────────────────────────────────────────────────── the form */
(function () {
  'use strict';
  var form = document.getElementById('bookform');
  if (!form) return;
  var ty = document.getElementById('ty'), sum = document.getElementById('sum');
  var NOTE = {
    'hvac-none': 'Treated as urgent. If it is over 95F or under 45F outside, call instead of typing.',
    'hvac-part': 'Booked as a diagnostic. Bring us the noise or the smell, it narrows it fast.',
    'elec-dead': 'Treated as urgent. Do not reset the breaker again if it is warm to touch.',
    'elec-new': 'Quoted flat from the rates above, once we have seen the panel.',
    'diag': 'Flat two hours. You get the list of what we ruled out either way.'
  };
  function write() { sum.textContent = NOTE[ty.value] || ''; }
  ty.addEventListener('change', write); write();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var state = document.getElementById('state');
    var missing = [].slice.call(form.querySelectorAll('[required]'))
                    .filter(function (x) { return !x.value.trim(); });
    if (missing.length) { state.textContent = 'A name and a phone number is all we need.'; missing[0].focus(); return; }
    var ph = document.getElementById('ph');
    if (ph.value.replace(/\D/g, '').length < 10) {
      state.textContent = 'That phone number is short a few digits.'; ph.focus(); return;
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
  FX.boot({ anchorOffset: -88 });
  var soft = FX.reduce;

  /* Reduced motion is not "gentler motion" — it is none. Every reveal
     below is scroll-linked, and a scroll-linked tween that has not been
     triggered yet is just content held at opacity zero. So the whole
     choreography is skipped and the page renders as plain markup.
     FX.boot has already run, so in-page anchors still work. */
  if (soft) return;

  /* DISPATCH barely moves, and that is the position. Somebody at 6am
     with no heat is not here to be impressed. Everything is short,
     flat and out of the way; the only thing that animates with any
     weight is the board, because the board is the product. */
  var D = 0.34, EASE = 'power1.out';

  if (!soft) {
    g.from('.board-k', { opacity: 0, duration: D, ease: EASE });
    g.from('.board-h', { opacity: 0, y: 12, duration: 0.5, ease: EASE, delay: 0.05 });
    g.from('.live-r', { opacity: 0, y: 10, duration: D, ease: EASE, stagger: 0.05, delay: 0.2 });
    g.from('.board-act > *', { opacity: 0, duration: D, ease: EASE, stagger: 0.06, delay: 0.42 });
  }

  ['.sec-h', '.row', '.tbl tbody tr', '.area-d > div', '.area-f', '.f', '.rates-h p', '.area-b p'].forEach(function (sel) {
    g.utils.toArray(sel).forEach(function (el, i) {
      g.from(el, { opacity: 0, y: 8, duration: D, ease: EASE, delay: (i % 10) * 0.02,
        scrollTrigger: { trigger: el, start: 'top 96%' } });
    });
  });

  /* the board is the one thing allowed to draw attention to itself:
     when the next slot changes, the tile pulses once. */
  var next = document.getElementById('vNext');
  if (next && !soft) {
    var last = next.textContent;
    setInterval(function () {
      if (next.textContent === last) return;
      last = next.textContent;
      g.fromTo(next.closest('.live-r'), { backgroundColor: 'rgba(255,255,255,0.22)' },
        { backgroundColor: 'rgba(255,255,255,0)', duration: 1.1, ease: 'power2.out', clearProps: 'backgroundColor' });
    }, 4000);
  }

  FX.video(document.querySelector('.board-media'));
  var img = document.querySelector('.area-f img');
  if (img) { FX.gl(img, { grain: 0.02 }); FX.run(); }

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
