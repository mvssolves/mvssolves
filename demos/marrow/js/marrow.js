/* ═══════════════════════════════════════════════════════════════════
   MARROW — vanilla, no dependencies, no media files.

   Two things here are worth reading:

   1. The hearth sound is synthesised in Web Audio rather than loaded.
      Filtered brown noise for the roar, scheduled decaying bursts for
      the crackle. No mp3 to download, nothing to autoplay, and it only
      ever starts from a click on a control that says what it does.

   2. The fire sequence is a hand-rolled pin. It gives up pinning the
      moment the sticky column is taller than the viewport, because a
      pinned block that doesn't fit hides its own overflow forever.
   ═══════════════════════════════════════════════════════════════════ */

document.documentElement.classList.add('js');
var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─────────────────────────────────────────────── scramble reveal */
(function () {
  'use strict';
  if (REDUCE || !('IntersectionObserver' in window)) return;
  var GLYPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+=/\\';

  function scramble(el) {
    var html = el.innerHTML;
    // work per text line so a <br> survives the animation intact
    var lines = html.split(/<br\s*\/?>/i).map(function (s) { return s.trim(); });
    var target = lines.join('\n');
    var frame = 0, total = target.length + 22;

    function step() {
      var out = '';
      for (var i = 0; i < target.length; i++) {
        var c = target[i];
        if (c === '\n' || c === ' ') { out += c; continue; }
        if (i < frame - 14) out += c;
        else if (i < frame) out += GLYPH[(Math.floor(frame * 7 + i * 13)) % GLYPH.length];
        else out += ' ';
      }
      el.textContent = out;
      frame += 1.6;
      if (frame < total) requestAnimationFrame(step);
      else { el.innerHTML = html; }
    }
    el.classList.add('scr');
    step();
  }

  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      scramble(e.target);
    });
  }, { rootMargin: '0px 0px -18% 0px' });

  [].forEach.call(document.querySelectorAll('[data-scramble]'), function (el) { io.observe(el); });
})();

/* ────────────────────────────────────────────────── ember drift */
(function () {
  'use strict';
  if (REDUCE) return;
  var cv = document.getElementById('drift');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  if (!ctx) return;
  var dpr = Math.min(devicePixelRatio || 1, 1.5);
  var parts = [], W = 0, H = 0, run = true;

  function size() {
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function seed() {
    parts = [];
    var n = Math.round(Math.min(70, W / 22));
    for (var i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * W, y: H + Math.random() * H,
        r: 0.6 + Math.random() * 1.6,
        v: 0.18 + Math.random() * 0.55,
        d: Math.random() * 6.28,
        a: 0.15 + Math.random() * 0.5
      });
    }
  }
  function frame() {
    if (!run) return;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.y -= p.v; p.d += 0.012;
      p.x += Math.sin(p.d) * 0.32;
      if (p.y < -12) { p.y = H + 12; p.x = Math.random() * W; }
      // embers cool as they rise, so they fade toward the top
      var life = Math.max(0, Math.min(1, p.y / H));
      ctx.globalAlpha = p.a * life;
      ctx.fillStyle = life > 0.55 ? '#f0a04a' : '#d9622c';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  addEventListener('resize', function () { size(); seed(); }, { passive: true });

  // stop burning cycles once the hero has left the screen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      var vis = es[0].isIntersecting;
      if (vis && !run) { run = true; requestAnimationFrame(frame); }
      run = vis;
    }, { threshold: 0 }).observe(cv);
  }
  size(); seed(); requestAnimationFrame(frame);
})();

/* ──────────────────────────────────── the fire sequence (pinned) */
(function () {
  'use strict';
  var sec = document.querySelector('.fire');
  var stick = document.querySelector('.fire-stick');
  var imgs = [].slice.call(document.querySelectorAll('.fire-stack img'));
  if (!sec || !stick || imgs.length < 2) return;

  function guard() {
    // give up pinning if the sticky column cannot fit the viewport
    var fits = stick.scrollHeight < innerHeight - 120;
    stick.classList.toggle('tall', !fits);
  }

  var t = false;
  function run() {
    var r = sec.getBoundingClientRect();
    var span = r.height - innerHeight;
    if (span <= 0) return;
    var p = Math.max(0, Math.min(0.999, -r.top / span));
    var i = Math.floor(p * imgs.length);
    imgs.forEach(function (im, n) { im.classList.toggle('on', n === i); });
  }

  addEventListener('scroll', function () {
    if (t) return; t = true;
    requestAnimationFrame(function () { t = false; run(); });
  }, { passive: true });
  addEventListener('resize', function () { guard(); run(); }, { passive: true });
  guard(); run();
})();

/* ────────────────────────────────────────── the hearth, synthesised */
(function () {
  'use strict';
  var btn = document.getElementById('snd');
  if (!btn) return;
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { btn.hidden = true; return; }

  var ac = null, master = null, timer = null, on = false;

  function noiseBuffer(sec) {
    var len = Math.floor(ac.sampleRate * sec);
    var b = ac.createBuffer(1, len, ac.sampleRate);
    var d = b.getChannelData(0), last = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;      // brown-ish: heavier at the bottom
      d[i] = last * 3.2;
    }
    return b;
  }

  function start() {
    ac = ac || new AC();
    if (ac.state === 'suspended') ac.resume();

    master = ac.createGain();
    master.gain.setValueAtTime(0.0001, ac.currentTime);
    master.gain.exponentialRampToValueAtTime(0.16, ac.currentTime + 1.6);
    master.connect(ac.destination);

    // the roar: looping brown noise under a low shelf
    var roar = ac.createBufferSource();
    roar.buffer = noiseBuffer(3); roar.loop = true;
    var lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.6;
    var rg = ac.createGain(); rg.gain.value = 0.5;
    roar.connect(lp); lp.connect(rg); rg.connect(master);
    roar.start();
    master._roar = roar;

    // the crackle: short bursts, band-passed high, decaying instantly
    function pop() {
      if (!on) return;
      var s = ac.createBufferSource();
      s.buffer = noiseBuffer(0.06);
      var bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900 + Math.random() * 2600;
      bp.Q.value = 3 + Math.random() * 6;
      var g = ac.createGain();
      var t0 = ac.currentTime;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.15 + Math.random() * 0.5, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05 + Math.random() * 0.12);
      s.connect(bp); bp.connect(g); g.connect(master);
      s.start(); s.stop(t0 + 0.3);
      timer = setTimeout(pop, 40 + Math.random() * 460);
    }
    pop();
  }

  function stop() {
    clearTimeout(timer);
    if (!master) return;
    var m = master;
    m.gain.cancelScheduledValues(ac.currentTime);
    m.gain.setValueAtTime(m.gain.value, ac.currentTime);
    m.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.7);
    setTimeout(function () {
      try { m._roar.stop(); } catch (e) {}
      try { m.disconnect(); } catch (e) {}
    }, 900);
    master = null;
  }

  btn.addEventListener('click', function () {
    on = !on;
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Stop the sound of the hearth' : 'Play the sound of the hearth');
    if (on) start(); else stop();
  });

  // never keep making noise into a tab nobody is looking at
  addEventListener('visibilitychange', function () {
    if (document.hidden && on) { on = false; btn.setAttribute('aria-pressed', 'false'); stop(); }
  });
})();

/* ─────────────────────────────────────────────── reservation form */
(function () {
  'use strict';
  var form = document.getElementById('res');
  if (!form) return;
  var pp = document.getElementById('pp'), sit = document.getElementById('sit'),
      sum = document.getElementById('sum');

  function write() {
    var n = +pp.value;
    var total = n * 115;
    sum.textContent = n + (n === 1 ? ' seat' : ' seats') + ' at ' + sit.value +
      ' — $' + total.toLocaleString('en-US') + ' before wine.' +
      (n > 4 ? ' Six is our limit on one booking; more than that, call.' : '');
  }
  pp.addEventListener('change', write); sit.addEventListener('change', write);
  write();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var state = document.getElementById('state');
    var missing = [].slice.call(form.querySelectorAll('[required]'))
                    .filter(function (x) { return !x.value.trim(); });
    if (missing.length) { state.textContent = 'We need a name and an email.'; missing[0].focus(); return; }
    var em = document.getElementById('em');
    if (em.value.indexOf('@') < 1 || em.value.indexOf('.') < 0) {
      state.textContent = 'That email will not reach you.'; em.focus(); return;
    }
    state.textContent = 'Demo build — no endpoint wired. Nothing was sent.';
  });
})();

/* ─────────────────────────────────────────────────────── reveals */
(function () {
  'use strict';
  if (REDUCE || !('IntersectionObserver' in window)) return;
  var vh = innerHeight;
  var sels = ['.sec-h', '.beats li', '.courses li', '.pair>div', '.room-f',
              '.room-b p', '.room-d', '.table-b p', '.f', '.menu-h p', '.quiet-s'];
  var items = [];
  sels.forEach(function (s) {
    [].forEach.call(document.querySelectorAll(s), function (el) {
      el.classList.add('rv'); items.push(el);
    });
  });
  items.forEach(function (el) {
    if (el.getBoundingClientRect().top > vh * 0.92) el.classList.add('pre');
  });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.remove('pre'); io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach(function (el) { io.observe(el); });

  // courses arrive as a burst, which is the point of the pacing
  [].forEach.call(document.querySelectorAll('.courses li'), function (el, i) {
    el.style.transitionDelay = (i * 0.045) + 's';
  });
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
    links.forEach(function (a, i) { a.style.transitionDelay = open ? (0.14 + i * 0.055) + 's' : '0s'; });
  }
  burger.addEventListener('click', function () { set(!open); });
  links.forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) set(false); });
  matchMedia('(min-width: 921px)').addEventListener('change', function (e) { if (e.matches && open) set(false); });
})();

/* ────────────────────────────────── nav retract, bar, parallax */
(function () {
  'use strict';
  if (REDUCE) return;
  var last = 0, t = false;
  var bar = document.getElementById('actionbar');
  var roomImg = document.querySelector('.room-f img');
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
        var tb = document.getElementById('table');
        var at = tb && tb.getBoundingClientRect().top < innerHeight * 0.92;
        bar.classList.toggle('up', y > innerHeight * 0.75 && !at
          && !document.body.classList.contains('locked'));
      }
      if (roomImg) {
        var r = roomImg.getBoundingClientRect();
        var p = 1 - (r.top + r.height / 2) / (innerHeight / 2 + r.height / 2);
        roomImg.style.setProperty('--py', (p * -2.6).toFixed(2) + '%');
      }
    });
  }, { passive: true });
})();

/* ──────────────────────────────────────────────────────── failsafe */
setTimeout(function () {
  [].forEach.call(document.querySelectorAll('.pre'), function (el) { el.classList.remove('pre'); });
}, 3000);
