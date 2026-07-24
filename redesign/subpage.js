/* Shared behaviour for the redesign's subpages (legal, FAQ, careers, contact).
   Only job right now: build the animated footer wordmark, the same one the home page has.
   Kept as a file rather than inlined into each page because there are nine of them and a
   copy per page is how they drift apart. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wm = document.querySelector('.foot-wordmark');
  if (!wm) return;

  /* Per-letter outer + inner + face. Outer sways, inner bobs and carries the extruded body,
     face carries the water gradient. Angles, depth and all three durations are derived from the
     letter index rather than Math.random, so a reload gives the same wordmark. The moduli avoid
     sharing factors with the letter count, which is what stops neighbours matching. */
  var text = wm.textContent.trim();
  wm.textContent = '';
  var i = 0;
  var risers = [];
  for (var c = 0; c < text.length; c++) {
    var ch = text[c];
    if (ch === ' ') {
      var sp = document.createElement('span');
      sp.className = 'wm-sp';
      wm.appendChild(sp);
      continue;
    }
    var n = i;
    var outer = document.createElement('span');
    outer.className = 'wm-l';
    outer.style.setProperty('--i', n);
    outer.style.setProperty('--rx', (2 + (n * 37) % 3) + 'deg');
    outer.style.setProperty('--ry', (2 + (n * 53) % 3) + 'deg');
    outer.style.setProperty('--rz', (((n * 29) % 5) - 2) + 'deg');
    outer.style.setProperty('--z', (8 + (n * 41) % 13) + 'px');
    outer.style.setProperty('--a', (0.008 + ((n * 13) % 6) / 700).toFixed(4) + 'em');
    outer.style.setProperty('--d1', (5.4 + ((n * 7) % 14) / 10).toFixed(2) + 's');
    outer.style.setProperty('--d2', (7.1 + ((n * 11) % 19) / 10).toFixed(2) + 's');
    outer.style.setProperty('--d3', (8.2 + ((n * 17) % 23) / 10).toFixed(2) + 's');

    var inner = document.createElement('span');
    inner.className = 'wm-i';
    inner.setAttribute('data-ch', ch);
    var face = document.createElement('span');
    face.className = 'wm-f';
    face.textContent = ch;
    inner.appendChild(face);
    outer.appendChild(inner);

    /* reveal wrappers -- .wm-l already animates transform, and an animation beats an inline
       style, so the scroll lift has to sit on a parent */
    var clip = document.createElement('span');
    clip.className = 'wm-w';
    var riser = document.createElement('span');
    riser.className = 'wm-r';
    riser.appendChild(outer);
    clip.appendChild(riser);
    wm.appendChild(clip);
    risers.push(riser);
    i++;
  }

  /* Letters peek up one at a time as the footer arrives, each on its own overlapping slice of
     the scroll range, so it reads as a wave rather than a stepped sequence. */
  var N = risers.length;
  function reveal() {
    var r = wm.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    var p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.55)));
    for (var k = 0; k < N; k++) {
      var start = (k / N) * 0.72;
      var local = Math.max(0, Math.min(1, (p - start) / 0.34));
      var eased = local < 0.5 ? 4 * local * local * local : 1 - Math.pow(-2 * local + 2, 3) / 2;
      risers[k].style.transform = 'translateY(' + ((1 - eased) * 105) + '%)';
    }
  }
  reveal();
  addEventListener('scroll', reveal, {passive: true});
  addEventListener('resize', reveal, {passive: true});

  /* the blurred glow behind it only animates while the footer is actually on screen */
  if (reduce || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(function (es) {
    if (wm.parentElement) wm.parentElement.classList.toggle('live', es[0].isIntersecting);
  }, {rootMargin: '120px'}).observe(wm);
})();
