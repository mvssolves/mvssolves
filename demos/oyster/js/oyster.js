/* ═══════════════════════════════════════════════════════════════════
   OYSTER

   Vanilla. No GSAP, no Lenis, nothing loaded from anywhere.

   The one ambitious piece is a WebGL thin-film shader over the hero.
   It renders *only* the iridescence — the canvas is screen-blended over
   the photograph beneath it — so there is no texture to load, no CORS
   to negotiate, and no way for a shader failure to take the image with
   it. If WebGL is unavailable the canvas simply never fades in.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  document.documentElement.classList.add('js');
})();

var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ────────────────────────────────────────────── nacre, in WebGL */
(function () {
  'use strict';
  var cv = document.getElementById('sheen');
  if (!cv) return;

  var gl = cv.getContext('webgl', { alpha: true, antialias: false, depth: false })
        || cv.getContext('experimental-webgl');
  if (!gl) return;                       // photo alone carries the hero

  var VS =
    'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';

  var FS = [
    'precision highp float;',
    'uniform vec2 u_res; uniform vec2 u_mouse; uniform float u_time; uniform float u_scroll;',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}',
    'float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.03;a*=0.5;}return v;}',
    // thin-film interference reads as a cosine palette offset per channel
    'vec3 nacre(float t){return 0.5+0.5*cos(6.28318*(vec3(t)+vec3(0.0,0.33,0.67)));}',
    'void main(){',
    '  vec2 uv=gl_FragCoord.xy/u_res;',
    '  vec2 p=uv*vec2(u_res.x/u_res.y,1.0);',
    '  float t=u_time*0.042;',
    '  float f=fbm(p*2.6+vec2(t,-t*0.62)+u_scroll*0.45);',
    '  f+=0.45*fbm(p*5.4-vec2(t*1.35,t));',
    // the cursor lifts the film locally, the way tilting a shell does
    '  float d=distance(uv,u_mouse);',
    '  float lift=exp(-d*d*7.5)*0.5;',
    '  vec3 col=nacre(f*0.85+lift*1.2+u_scroll*0.18);',
    '  float mask=smoothstep(0.0,0.8,1.0-uv.y)*(0.17+lift);',
    '  mask*=0.6+0.4*fbm(p*1.35+t*0.8);',
    '  gl_FragColor=vec4(col*mask,1.0);',
    '}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
    return s;
  }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;

  var pr = gl.createProgram();
  gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);

  // one oversized triangle covers the clip space; cheaper than two
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(pr, 'u_res'),
      uMouse = gl.getUniformLocation(pr, 'u_mouse'),
      uTime = gl.getUniformLocation(pr, 'u_time'),
      uScroll = gl.getUniformLocation(pr, 'u_scroll');

  var mouse = [0.5, 0.35], target = [0.5, 0.35], scroll = 0;

  function size() {
    var dpr = Math.min(devicePixelRatio || 1, 1.5);
    var w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    gl.uniform2f(uRes, cv.width, cv.height);
  }

  function frame(ms) {
    size();
    // ease the cursor so the film lags the hand slightly
    mouse[0] += (target[0] - mouse[0]) * 0.06;
    mouse[1] += (target[1] - mouse[1]) * 0.06;
    gl.uniform2f(uMouse, mouse[0], mouse[1]);
    gl.uniform1f(uTime, ms * 0.001);
    gl.uniform1f(uScroll, scroll);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!REDUCE) requestAnimationFrame(frame);
  }

  addEventListener('pointermove', function (e) {
    var r = cv.getBoundingClientRect();
    target[0] = (e.clientX - r.left) / r.width;
    target[1] = 1 - (e.clientY - r.top) / r.height;
  }, { passive: true });

  addEventListener('scroll', function () {
    scroll = Math.min(1, scrollY / Math.max(1, innerHeight));
  }, { passive: true });

  addEventListener('resize', size, { passive: true });

  cv.classList.add('on');
  requestAnimationFrame(frame);
})();

/* ───────────────────────────────────────────────────────── reveals */
(function () {
  'use strict';
  if (REDUCE || !('IntersectionObserver' in window)) return;
  var vh = innerHeight;

  // everything worth revealing, marked here rather than in the markup
  var sels = ['.say-p', '.sec-h', '.row', '.room-media', '.room-b p', '.per',
              '.opt', '.tot', '.book-b p', '.f', '.hero-meta'];
  var items = [];
  sels.forEach(function (s) {
    [].forEach.call(document.querySelectorAll(s), function (el) {
      el.classList.add('rv');
      items.push(el);
    });
  });

  // pre-hide only what is below the fold — nothing on screen may flash
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

  // grouped children sequence rather than arriving together
  [].forEach.call(document.querySelectorAll('[data-stagger]'), function (g) {
    [].forEach.call(g.children, function (c, i) { c.style.transitionDelay = (i * 0.07) + 's'; });
  });
})();

/* ─────────────────────────────────── treatment row → sticky image */
(function () {
  'use strict';
  var img = document.getElementById('rowimg');
  var rows = [].slice.call(document.querySelectorAll('.row'));
  if (!img || !rows.length) return;
  var current = img.getAttribute('src');

  function show(src) {
    if (src === current) return;
    current = src;
    img.classList.add('fade');
    var next = new Image();
    next.onload = function () { img.src = src; img.classList.remove('fade'); };
    next.onerror = function () { img.classList.remove('fade'); };
    next.src = src;
  }

  rows.forEach(function (r) {
    var src = r.getAttribute('data-img');
    if (!src) return;
    r.addEventListener('mouseenter', function () { show(src); });
    // keyboard and touch users get the same thing without a hover
    r.addEventListener('focusin', function () { show(src); });
  });

  // on the way down the page, the row nearest the middle wins
  if (!REDUCE && 'IntersectionObserver' in window && matchMedia('(min-width:1000px)').matches) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          rows.forEach(function (r) { r.classList.remove('act'); });
          e.target.classList.add('act');
          show(e.target.getAttribute('data-img'));
        }
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    rows.forEach(function (r) { io.observe(r); });
  }
})();

/* ───────────────────────────────────────────────── price calculator */
(function () {
  'use strict';
  var form = document.getElementById('calc');
  if (!form) return;
  var boxes = [].slice.call(form.querySelectorAll('input[type="checkbox"]'));
  var usdEl = document.getElementById('totUsd');
  var minEl = document.getElementById('totMin');
  var note = document.getElementById('priceNote');

  function run() {
    var usd = 0, min = 0, n = 0;
    boxes.forEach(function (b) {
      if (!b.checked) return;
      usd += +b.dataset.usd; min += +b.dataset.min; n++;
    });
    usdEl.textContent = '$' + usd.toLocaleString('en-US');

    if (!n) { minEl.textContent = 'Nothing selected'; note.textContent = 'Consults are $0 and always have been.'; return; }

    // more than one treatment is more than one visit — say so rather than
    // letting the number imply a single afternoon
    var visits = n === 1 ? 'one visit'
      : n + ' visits, spaced at least three weeks apart';
    var h = Math.floor(min / 60), m = min % 60;
    var dur = h ? (h + (h > 1 ? ' hours' : ' hour') + (m ? ' ' + m : '')) : (min + ' minutes');
    minEl.textContent = dur + (h && m ? ' minutes' : '') + ', ' + visits;

    note.textContent = n > 2
      ? 'That is more than we would start you on. A consult would cut this list down.'
      : 'Consults are $0 and always have been.';
  }
  boxes.forEach(function (b) { b.addEventListener('change', run); });
  run();
})();

/* ──────────────────────────────────────────────── booking form */
(function () {
  'use strict';
  var form = document.getElementById('booking');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var state = document.getElementById('state');
    var missing = [].slice.call(form.querySelectorAll('[required]'))
                    .filter(function (f) { return !f.value.trim(); });
    if (missing.length) { state.textContent = 'Add your name and email first.'; missing[0].focus(); return; }
    var em = document.getElementById('em');
    if (em.value.indexOf('@') < 1 || em.value.indexOf('.') < 0) {
      state.textContent = 'That email does not look right.'; em.focus(); return;
    }
    state.textContent = 'Demo build — no endpoint wired. Nothing was sent.';
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
    links.forEach(function (a, i) { a.style.transitionDelay = open ? (0.14 + i * 0.05) + 's' : '0s'; });
  }
  burger.addEventListener('click', function () { set(!open); });
  links.forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) set(false); });
  matchMedia('(min-width: 881px)').addEventListener('change', function (e) { if (e.matches && open) set(false); });
})();

/* ────────────────────────────────────── nav retract, action bar */
(function () {
  'use strict';
  if (REDUCE) return;
  var last = 0, t = false;
  var bar = document.getElementById('actionbar');
  var roomImg = document.querySelector('.room-media img');

  addEventListener('scroll', function () {
    if (t) return;
    t = true;
    requestAnimationFrame(function () {
      t = false;
      var y = scrollY;
      if (!document.body.classList.contains('locked')) {
        document.body.classList.toggle('nav-up', y > innerHeight * 0.6 && y > last + 4);
      }
      last = y;

      if (bar) {
        var book = document.getElementById('book');
        var atBook = book && book.getBoundingClientRect().top < innerHeight * 0.92;
        bar.classList.toggle('up', y > innerHeight * 0.75 && !atBook
          && !document.body.classList.contains('locked'));
      }

      if (roomImg) {
        var r = roomImg.getBoundingClientRect();
        var p = 1 - (r.top + r.height / 2) / (innerHeight / 2 + r.height / 2);
        roomImg.style.setProperty('--py', (p * -2.4).toFixed(2) + '%');
      }
    });
  }, { passive: true });
})();

/* ─────────────────────────────────────────────────────── failsafe
   If an observer never fires — a throttled background tab, an odd
   embedded webview — nothing should stay hidden. */
setTimeout(function () {
  [].forEach.call(document.querySelectorAll('.pre'), function (el) { el.classList.remove('pre'); });
}, 3000);
