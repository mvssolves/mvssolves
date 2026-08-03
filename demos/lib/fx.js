/* ═══════════════════════════════════════════════════════════════════
   fx.js — the only thing the six builds share.

   Infrastructure, never design. No colour, no type, no spacing, no
   easing curve lives here. Each build imports this and then writes its
   own choreography on top, which is why they still look like six
   different studios made them.

   Three things:
     FX.boot()      Lenis driven off GSAP's ticker, ScrollTrigger wired
                    to it, and one honest set of reduced-motion guards.
     FX.gl(img)     a WebGL layer over a photograph: scroll velocity
                    warps it, the pointer pushes it, and it reveals
                    through noise instead of a fade.
     FX.split(el)   SplitText with a mask per line, and a real cleanup.

   Everything degrades to the plain document. No WebGL, no JS, reduced
   motion, an old browser — you get the photograph and the text, always.
   ═══════════════════════════════════════════════════════════════════ */

window.FX = (function () {
  'use strict';

  var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COARSE = matchMedia('(pointer: coarse)').matches;
  var api = { reduce: REDUCE, coarse: COARSE, lenis: null };

  /* ───────────────────────────────────────────────────────── boot */
  api.boot = function (opts) {
    opts = opts || {};
    document.documentElement.classList.add('js');

    if (!window.gsap) return api;
    gsap.registerPlugin(window.ScrollTrigger, window.SplitText, window.Flip);

    // Reduced motion is not "smaller animations", it is no scroll-linked
    // motion at all. ScrollTrigger still runs so classes/callbacks fire.
    if (REDUCE) {
      gsap.defaults({ duration: 0.001, ease: 'none' });
      if (window.ScrollTrigger) ScrollTrigger.config({ ignoreMobileResize: true });
      return api;
    }

    if (window.Lenis) {
      var lenis = new Lenis({
        // touch keeps native scrolling: hijacking momentum on a phone is
        // the single most common way smooth scroll ruins a site
        smoothWheel: true,
        syncTouch: false,
        duration: opts.duration || 1.05,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }
      });
      api.lenis = lenis;
      lenis.on('scroll', function () { if (window.ScrollTrigger) ScrollTrigger.update(); });
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);

      // in-page anchors have to go through Lenis or they fight it
      document.addEventListener('click', function (e) {
        var a = e.target.closest('a[href^="#"]');
        if (!a) return;
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var t = document.querySelector(id);
        if (!t) return;
        e.preventDefault();
        lenis.scrollTo(t, { offset: opts.anchorOffset || -80 });
      });
    }
    return api;
  };

  /* ══════════════════════════ the WebGL image layer ══════════════
     A canvas is inserted over an <img> and the <img> is hidden from
     paint but left in the document, so alt text, lazy loading and the
     no-JS case all keep working. If anything here fails the class is
     never added and the photograph is simply what you see. */

  var VERT = 'attribute vec2 p;varying vec2 v;void main(){v=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}';

  var FRAG = [
    'precision mediump float;',
    'varying vec2 v;',
    'uniform sampler2D tex;',
    'uniform vec2 res;',      // canvas size
    'uniform vec2 img;',      // natural image size
    'uniform float vel;',     // scroll velocity, signed, roughly -1..1
    'uniform vec2 ptr;',      // pointer in uv
    'uniform float hov;',     // 0..1 hover weight
    'uniform float rev;',     // 0..1 reveal
    'uniform float grain;',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);',
    ' return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}',
    'void main(){',
    // object-fit: cover, done in the shader so CSS and GL agree
    '  float ra=res.x/res.y, ia=img.x/img.y;',
    '  vec2 uv=v; vec2 s=vec2(1.0);',
    '  if(ra>ia){ s.y=ia/ra; } else { s.x=ra/ia; }',
    '  uv=(uv-0.5)*s+0.5;',
    // scroll velocity bows the image, the way film gate weave looks
    '  float bow=sin(uv.x*3.14159)*vel*0.055;',
    '  uv.y+=bow;',
    '  uv.x+=sin(uv.y*3.14159)*vel*0.012;',
    // the pointer pushes a soft lens into the surface
    '  float d=distance(uv,ptr);',
    '  float lens=exp(-d*d*14.0)*hov;',
    '  uv+=normalize(uv-ptr+0.0001)*lens*-0.035;',
    // reveal through noise rather than opacity: it reads as material
    '  float n=noise(uv*7.0)*0.55+noise(uv*23.0)*0.45;',
    '  float edge=smoothstep(rev-0.35,rev+0.05,n+uv.y*0.22);',
    '  vec3 c=texture2D(tex,clamp(uv,0.001,0.999)).rgb;',
    '  c+=lens*0.10;',
    '  float g=(hash(v*res+vel)-0.5)*grain;',
    '  c+=g;',
    '  gl_FragColor=vec4(c,1.0-edge);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }

  api.gl = function (img, opts) {
    opts = opts || {};
    if (REDUCE || !img) return null;

    var host = img.parentElement;
    if (!host) return null;

    var cv = document.createElement('canvas');
    cv.className = 'fx-gl';
    cv.setAttribute('aria-hidden', 'true');
    var gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
    if (!gl) return null;

    var vs = compile(gl, gl.VERTEX_SHADER, VERT), fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    ['tex', 'res', 'img', 'vel', 'ptr', 'hov', 'rev', 'grain'].forEach(function (n) {
      U[n] = gl.getUniformLocation(pr, n);
    });

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        /* REV_DONE, not 1. The mask samples noise plus a uv.y bias, which
       together reach about 1.22, so a target of 1.0 leaves part of the
       photograph permanently transparent. Overshoot past the maximum. */
    var REV_DONE = 1.6;
    /* Default to fully revealed. The opposite default is a trap: a layer
       whose reveal is never driven sits at rev 0, which is fully
       transparent, and because the <img> beneath it is hidden the
       photograph simply disappears. Opting IN to the reveal cannot fail
       that way. */
    var state = { vel: 0, ptr: [0.5, 0.5], tptr: [0.5, 0.5], hov: 0, thov: 0,
                  rev: opts.reveal === true ? 0 : REV_DONE };
    var ready = false, alive = true, visible = false;

    function upload() {
      if (!img.naturalWidth) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); }
      catch (e) { alive = false; return; }
      gl.uniform2f(U.img, img.naturalWidth, img.naturalHeight);
      gl.uniform1i(U.tex, 0);
      ready = true;

      /* Inherit the photograph's own treatment. Every build grades its
         imagery with a CSS filter on the <img> — brightness, saturation,
         a duotone — and that grading is art direction, not decoration.
         Without this the canvas paints the raw file and blows the type
         contrast the build was designed around. */
      var f = getComputedStyle(img).filter;
      if (f && f !== 'none') cv.style.filter = f;

      host.classList.add('fx-on');
    }

    function size() {
      var dpr = Math.min(devicePixelRatio || 1, COARSE ? 1.5 : 2);
      var w = Math.max(1, Math.round(cv.clientWidth * dpr));
      var h = Math.max(1, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) {
        cv.width = w; cv.height = h; gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(U.res, cv.width, cv.height);
    }

    function draw() {
      if (!alive || !ready || !visible) return;
      size();
      state.ptr[0] += (state.tptr[0] - state.ptr[0]) * 0.09;
      state.ptr[1] += (state.tptr[1] - state.ptr[1]) * 0.09;
      state.hov += (state.thov - state.hov) * 0.08;
      gl.uniform1f(U.vel, state.vel);
      gl.uniform2f(U.ptr, state.ptr[0], state.ptr[1]);
      gl.uniform1f(U.hov, state.hov);
      gl.uniform1f(U.rev, state.rev);
      gl.uniform1f(U.grain, opts.grain == null ? 0.045 : opts.grain);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    host.classList.add('fx-host');
    host.appendChild(cv);

    if (img.complete && img.naturalWidth) upload();
    else img.addEventListener('load', upload, { once: true });

    // only burn a draw call while the thing is actually on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; })
        .observe(cv);
    } else { visible = true; }

    if (!COARSE) {
      host.addEventListener('pointermove', function (e) {
        var r = cv.getBoundingClientRect();
        state.tptr[0] = (e.clientX - r.left) / r.width;
        state.tptr[1] = 1 - (e.clientY - r.top) / r.height;
        state.thov = 1;
      }, { passive: true });
      host.addEventListener('pointerleave', function () { state.thov = 0; }, { passive: true });
    }

    var handle = {
      draw: draw,
      set velocity(v) { state.vel = v; },
      reveal: function (dur) {
        // always drive from 0, so calling reveal() works whatever the
        // starting state was
        gsap.fromTo(state, { rev: 0 },
          { rev: REV_DONE, duration: dur || 1.4, ease: 'power2.inOut' });
      },
      destroy: function () { alive = false; cv.remove(); host.classList.remove('fx-on'); }
    };
    (api._layers = api._layers || []).push(handle);
    return handle;
  };

  // one ticker for every layer on the page, velocity shared from ScrollTrigger
  api.run = function () {
    if (REDUCE || !window.gsap) return;
    gsap.ticker.add(function () {
      var v = 0;
      if (window.ScrollTrigger) {
        var raw = ScrollTrigger.isScrolling() ? (api.lenis ? api.lenis.velocity : 0) : 0;
        v = gsap.utils.clamp(-1, 1, (raw || 0) / 45);
      }
      (api._layers || []).forEach(function (l) { l.velocity = v; l.draw(); });
    });
  };

  /* ─────────────────────────────────────────────── split headings */
  api.split = function (el, type) {
    if (!window.SplitText || !el) return null;
    return new SplitText(el, {
      type: type || 'lines',
      mask: 'lines',
      linesClass: 'fx-line'
    });
  };

  return api;
})();
