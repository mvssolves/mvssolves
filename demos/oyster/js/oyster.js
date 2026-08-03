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

  /* OYSTER moves like liquid: long, slow, nothing ever snaps. */
  var EASE = 'power3.out', SLOW = 1.5;

  /* The nacre shader above already owns this hero — it is the brand mark.
     Stacking a second canvas on it would be two effects fighting, so the
     WebGL image layer goes on the treatment plate and the room instead. */
  FX.video(document.querySelector('.hero-media'));
  var plate = document.getElementById('rowimg');
  var layer = plate && FX.gl(plate, { grain: 0.04 });
  FX.run();
  if (layer) layer.reveal(1.6);

  if (!soft) {
    var h1 = FX.split(document.querySelector('.hero-h'));
    if (h1) g.from(h1.lines, { yPercent: 118, duration: 1.5, ease: EASE, stagger: 0.11, delay: 0.15 });
    g.from('.hero-p, .hero-act, .hero-meta', { opacity: 0, y: 26, duration: 1.2, ease: EASE, stagger: 0.1, delay: 0.6 });
  }

  g.utils.toArray('.sec-h').forEach(function (h) {
    var s = FX.split(h);
    if (!s) return;
    g.from(s.lines, {
      yPercent: 118, duration: SLOW, ease: EASE, stagger: 0.1,
      scrollTrigger: { trigger: h, start: 'top 86%' }
    });
  });

  /* the statement is the one place the page slows to a stop */
  var say = document.querySelector('.say-p');
  if (say && !soft) {
    var ss = FX.split(say, 'words');
    g.from(ss.words, {
      opacity: 0.12, duration: 1, ease: 'none', stagger: 0.045,
      scrollTrigger: { trigger: say, start: 'top 78%', end: 'bottom 60%', scrub: 0.8 }
    });
  }

  g.utils.toArray('.row').forEach(function (r, i) {
    g.from(r, { opacity: 0, y: 34, duration: 1.25, ease: EASE,
      scrollTrigger: { trigger: r, start: 'top 90%' } });
  });

  ['.per', '.opt', '.tot', '.f', '.room-b p', '.book-b p'].forEach(function (sel) {
    g.utils.toArray(sel).forEach(function (el, i) {
      g.from(el, { opacity: 0, y: 22, duration: 1.1, ease: EASE, delay: (i % 4) * 0.06,
        scrollTrigger: { trigger: el, start: 'top 92%' } });
    });
  });

  var roomImg = document.querySelector('.room-media img');
  if (roomImg && !soft) {
    FX.gl(roomImg, { grain: 0.035, reveal: true });
    g.fromTo(roomImg, { yPercent: -5 }, { yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: roomImg, start: 'top bottom', end: 'bottom top', scrub: 1 } });
  }

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
