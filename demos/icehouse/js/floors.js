/* ═══════════════════════════════════════════════════════════════════
   ICEHOUSE — the building, as data.

   One source for six floors. The 2D plans and the 3D section are both
   drawn from this, so they can never disagree about where a wall is.
   That was the whole reason to write it down: hand-drawn SVG plans and
   a hand-built model drift apart the first time a unit count changes.

   Plan coordinates are in feet, measured from the south-west corner of
   the slab. The building is 120 ft east–west by 84 ft north–south, and
   the core (stair, lift, the old chute shaft) sits against the north
   wall where it always did.

   Unit counts here are the counts everywhere: 4,5,5,5,5,4 = 28, with
   1,2,3,2,3,2 = 13 remaining. Change a number and the hero, the copy,
   the shaft, the form and the sticky bar all have to move with it.
   ═══════════════════════════════════════════════════════════════════ */

window.ICEHOUSE = (function () {
  'use strict';

  var W = 120, D = 84;                 /* slab, in feet */
  var CORE = { x: 52, y: 60, w: 22, d: 24 };   /* stair + lift, north wall */

  /* Each floor: the level label, the storey height, and the units as
     rectangles on the slab. `t` marks a terrace rather than a loft, so
     the plan can dash it and the model can leave it open to the sky. */
  var floors = [
    {
      id: 0, level: 'Level 2', name: 'The loading floor', h: 10.5,
      lofts: 4, left: 1, from: '$865k', size: '1,240–1,610 sq ft',
      units: [
        { x: 4,  y: 4,  w: 44, d: 34 }, { x: 4,  y: 46, w: 44, d: 34 },
        { x: 72, y: 4,  w: 44, d: 34 }, { x: 72, y: 46, w: 44, d: 34 }
      ]
    },
    {
      id: 1, level: 'Level 3', name: 'First of the cold floors', h: 11,
      lofts: 5, left: 2, from: '$910k', size: '1,180–1,540 sq ft',
      units: [
        { x: 4,  y: 4,  w: 36, d: 34 }, { x: 4,  y: 46, w: 36, d: 34 },
        { x: 44, y: 4,  w: 32, d: 76 },
        { x: 80, y: 4,  w: 36, d: 34 }, { x: 80, y: 46, w: 36, d: 34 }
      ]
    },
    {
      id: 2, level: 'Level 4', name: 'Where the pipes ran', h: 11,
      lofts: 5, left: 3, from: '$955k', size: '1,180–1,600 sq ft',
      units: [
        { x: 4,  y: 4,  w: 32, d: 76 },
        { x: 40, y: 4,  w: 36, d: 34 }, { x: 40, y: 46, w: 36, d: 34 },
        { x: 80, y: 4,  w: 36, d: 34 }, { x: 80, y: 46, w: 36, d: 34 }
      ]
    },
    {
      id: 3, level: 'Level 5', name: 'The first floor with a view', h: 11,
      lofts: 5, left: 2, from: '$1.02m', size: '1,210–1,640 sq ft',
      units: [
        { x: 4,  y: 4,  w: 34, d: 34 }, { x: 4,  y: 46, w: 34, d: 34 },
        { x: 42, y: 4,  w: 32, d: 76 },
        { x: 78, y: 4,  w: 38, d: 34 }, { x: 78, y: 46, w: 38, d: 34 }
      ]
    },
    {
      id: 4, level: 'Level 6', name: 'Terraces begin', h: 11,
      lofts: 5, left: 3, from: '$1.19m', size: '1,350–1,780 sq ft',
      units: [
        { x: 4,  y: 4,  w: 44, d: 34 }, { x: 4,  y: 46, w: 44, d: 34 },
        { x: 52, y: 4,  w: 30, d: 34 },
        { x: 86, y: 4,  w: 30, d: 34 }, { x: 86, y: 46, w: 30, d: 34 },
        { x: 52, y: 46, w: 30, d: 34, t: true }
      ]
    },
    {
      id: 5, level: 'Level 7', name: 'Under the water tank', h: 14,
      lofts: 4, left: 2, from: '$1.64m', size: '1,620–2,240 sq ft',
      units: [
        { x: 4,  y: 4,  w: 44, d: 34 }, { x: 72, y: 4,  w: 44, d: 34 },
        { x: 4,  y: 46, w: 44, d: 34 }, { x: 72, y: 46, w: 44, d: 34 },
        { x: 52, y: 4,  w: 16, d: 34, t: true }
      ]
    }
  ];

  /* ── the plan, drawn from the same numbers ───────────────────────
     Rendered rather than authored so it cannot drift from the model.
     Sized in feet and scaled by the viewBox, which keeps the wall
     thicknesses honest at any size. */
  function plan(f) {
    var P = 10;                                   /* margin, in feet */
    var vb = [-P, -P, W + P * 2, D + P * 2].join(' ');
    var s = ['<svg viewBox="' + vb + '" class="plan" data-p="' + f.id +
             '" role="img" aria-label="Floor plan, ' + f.level + '">'];

    s.push('<g class="pl">');

    /* the envelope */
    s.push('<rect class="pl-w" x="0" y="0" width="' + W + '" height="' + D + '"/>');

    /* the column grid — 1924, so it is regular and it is in the way */
    for (var cx = 20; cx < W; cx += 20) {
      for (var cy = 20; cy < D; cy += 20) {
        s.push('<circle class="pl-c" cx="' + cx + '" cy="' + cy + '" r="1.6"/>');
      }
    }

    /* units */
    f.units.forEach(function (u) {
      s.push('<rect class="' + (u.t ? 'pl-t' : 'pl-u') + '" x="' + u.x + '" y="' +
             u.y + '" width="' + u.w + '" height="' + u.d + '"/>');
    });

    /* the core, hatched, against the north wall */
    s.push('<rect class="pl-k" x="' + CORE.x + '" y="' + CORE.y +
           '" width="' + CORE.w + '" height="' + CORE.d + '"/>');
    for (var hx = 0; hx <= CORE.w; hx += 5) {
      s.push('<line class="pl-h" x1="' + (CORE.x + hx) + '" y1="' + CORE.y +
             '" x2="' + (CORE.x + hx - CORE.d) + '" y2="' + (CORE.y + CORE.d) + '"/>');
    }

    /* window bays on the long south elevation, cut for machinery */
    for (var wx = 8; wx < W - 8; wx += 14) {
      s.push('<line class="pl-g" x1="' + wx + '" y1="0" x2="' + (wx + 9) + '" y2="0"/>');
    }

    /* dimension run along the bottom, because this is a plan, not a shape */
    s.push('<line class="pl-d" x1="0" y1="' + (D + 6) + '" x2="' + W + '" y2="' + (D + 6) + '"/>');
    s.push('<line class="pl-d" x1="0" y1="' + (D + 3) + '" x2="0" y2="' + (D + 9) + '"/>');
    s.push('<line class="pl-d" x1="' + W + '" y1="' + (D + 3) + '" x2="' + W + '" y2="' + (D + 9) + '"/>');
    s.push('<text class="pl-x" x="' + (W / 2) + '" y="' + (D + 4) + '">120\'</text>');

    /* north arrow, top-left, small */
    s.push('<g class="pl-n"><line x1="-5" y1="-2" x2="-5" y2="-9"/>' +
           '<path d="M-7.4 -6.6 L-5 -9.6 L-2.6 -6.6 Z"/></g>');

    s.push('</g></svg>');
    return s.join('');
  }

  return { W: W, D: D, CORE: CORE, floors: floors, plan: plan };
})();
