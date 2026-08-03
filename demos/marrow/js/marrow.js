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
  FX.boot({ anchorOffset: -96 });
  var soft = FX.reduce;

  /* Reduced motion is not "gentler motion" — it is none. Every reveal
     below is scroll-linked, and a scroll-linked tween that has not been
     triggered yet is just content held at opacity zero. So the whole
     choreography is skipped and the page renders as plain markup.
     FX.boot has already run, so in-page anchors still work. */
  if (soft) return;

  /* MARROW is cinema: violent contrast, long holds, then a burst. */
  var EASE = 'expo.out';

  var heroHost = document.querySelector('.hero-media');
  var heroVid = FX.video(heroHost);
  var hero = heroHost && heroHost.querySelector('img');
  var layer = hero && FX.gl(hero, { grain: 0.07, video: heroVid });
  FX.run();
  if (layer) layer.reveal(2.4);

  /* ── the scramble, rebuilt on top of SplitText ──────────────────
     The original version rewrote innerHTML on the same headings GSAP had
     already wrapped in line masks, so it ended up scrambling SplitText's
     own markup and printing it on the page. This drives the glyphs from
     inside the split instead, so the two cooperate.

     Each character's box is measured and locked before any swapping
     starts — otherwise substituting a W for an I reflows the whole line
     and the heading jitters for the length of the effect. */
  var GLYPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/\\';

  function burn(el, opts) {
    opts = opts || {};
    var sp = new SplitText(el, { type: 'chars,lines', mask: 'lines', linesClass: 'fx-line' });
    var chars = sp.chars;
    var finals = chars.map(function (c) { return c.textContent; });

    chars.forEach(function (c) {
      var w = c.getBoundingClientRect().width;
      if (w > 0) { c.style.display = 'inline-block'; c.style.width = w + 'px'; }
    });

    var o = { i: 0 };
    var tl = g.timeline(opts.st ? { scrollTrigger: opts.st } : { delay: opts.delay || 0 });
    tl.from(sp.lines, { yPercent: 120, duration: 1.5, ease: EASE, stagger: 0.13 }, 0);
    tl.to(o, {
      i: chars.length, duration: 1.15, ease: 'none',
      onUpdate: function () {
        var f = o.i | 0;
        for (var k = 0; k < chars.length; k++) {
          if (finals[k] === ' ') continue;
          chars[k].textContent = k < f ? finals[k] : GLYPH[(k * 7 + f * 5) % GLYPH.length];
        }
      },
      // never leave a glyph substituted, whatever happens to the tween
      onComplete: function () { chars.forEach(function (c, k) { c.textContent = finals[k]; }); }
    }, 0.15);
    return tl;
  }

  /* measured widths are meaningless until the webfont has actually landed */
  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () {
    var hero = document.querySelector('.hero-h');
    if (hero) burn(hero, { delay: 0.2 });

    /* the quiet screen holds, then releases — the pacing is the design */
    var q = document.querySelector('.quiet p:first-child');
    if (q) burn(q, { st: { trigger: q, start: 'top 76%' } });

    ST.refresh();
  });

  g.from('.hero-p, .hero .btn, .hero-f', { opacity: 0, y: 30, duration: 1.2, ease: EASE, stagger: 0.12, delay: 0.7 });

  g.utils.toArray('.sec-h').forEach(function (h) {
    var s = FX.split(h);
    if (!s) return;
    g.from(s.lines, { yPercent: 120, duration: 1.4, ease: EASE, stagger: 0.11,
      scrollTrigger: { trigger: h, start: 'top 85%' } });
  });

  /* the fire sequence, now pinned and scrubbed properly */
  var fire = document.querySelector('.fire'), imgs = g.utils.toArray('.fire-stack img');
  if (fire && imgs.length && matchMedia('(min-width:1000px)').matches && !soft) {
    g.set(imgs, { autoAlpha: 0 }); g.set(imgs[0], { autoAlpha: 1 });
    ST.create({
      trigger: fire, start: 'top top', end: 'bottom bottom',
      onUpdate: function (self) {
        var i = Math.min(imgs.length - 1, Math.floor(self.progress * imgs.length));
        imgs.forEach(function (im, n) { g.to(im, { autoAlpha: n === i ? 1 : 0, duration: 0.5, overwrite: true }); });
      }
    });
    g.utils.toArray('.beats li').forEach(function (li) {
      /* vertical, like everything else here — a horizontal from-state
         briefly widens the document on a phone */
      g.from(li, { opacity: 0, y: 24, duration: 1, ease: EASE,
        scrollTrigger: { trigger: li, start: 'top 88%' } });
    });
  }

  /* the menu is the burst: everything at once, fast */
  ST.create({ trigger: '.courses', start: 'top 82%', once: true, onEnter: function () {
    g.from('.courses li', { opacity: 0, y: 26, duration: 0.85, ease: EASE, stagger: 0.035 });
  }});
  g.utils.toArray('.pair > div').forEach(function (d, i) {
    g.from(d, { opacity: 0, y: 24, duration: 1, ease: EASE, delay: i * 0.08,
      scrollTrigger: { trigger: d, start: 'top 90%' } });
  });

  var roomImg = document.querySelector('.room-f img');
  if (roomImg && !soft) {
    FX.gl(roomImg, { grain: 0.05 });
    g.fromTo(roomImg, { yPercent: -6 }, { yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: roomImg, start: 'top bottom', end: 'bottom top', scrub: 1 } });
  }
  ['.room-b p', '.room-d > div', '.table-b p', '.f'].forEach(function (sel) {
    g.utils.toArray(sel).forEach(function (el, i) {
      g.from(el, { opacity: 0, y: 22, duration: 1, ease: EASE, delay: (i % 4) * 0.07,
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
