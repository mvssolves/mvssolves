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
    wm.appendChild(outer);
    i++;
  }

  /* the blurred glow behind it only animates while the footer is actually on screen */
  if (reduce || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(function (es) {
    if (wm.parentElement) wm.parentElement.classList.toggle('live', es[0].isIntersecting);
  }, {rootMargin: '120px'}).observe(wm);
})();
