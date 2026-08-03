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

/* ──────────────────────────────────────────────────────── reveals */
(function () {
  'use strict';
  if (REDUCE || !('IntersectionObserver' in window)) return;
  var vh = innerHeight;
  var sels = ['.sec-h', '.rates-h p', '.row', '.tbl', '.area-b p', '.area-d',
              '.area-f', '.call-b p', '.f', '.rates-n'];
  var items = [];
  sels.forEach(function (s) {
    [].forEach.call(document.querySelectorAll(s), function (el) { el.classList.add('rv'); items.push(el); });
  });
  items.forEach(function (el) { if (el.getBoundingClientRect().top > vh * 0.92) el.classList.add('pre'); });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.remove('pre'); io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -6% 0px' });
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

/* ─────────────────────────────────────────────── nav retract only
   The call bar never retracts on this build. On every other site in
   the library the action bar is a convenience; here it is the product. */
(function () {
  'use strict';
  if (REDUCE) return;
  var last = 0, t = false;
  addEventListener('scroll', function () {
    if (t) return; t = true;
    requestAnimationFrame(function () {
      t = false;
      var y = scrollY;
      if (!document.body.classList.contains('locked')) {
        document.body.classList.toggle('nav-up', y > innerHeight * 0.6 && y > last + 4);
      }
      last = y;
    });
  }, { passive: true });
})();

/* ─────────────────────────────────────────────────────── failsafe */
setTimeout(function () {
  [].forEach.call(document.querySelectorAll('.pre'), function (el) { el.classList.remove('pre'); });
}, 3000);
