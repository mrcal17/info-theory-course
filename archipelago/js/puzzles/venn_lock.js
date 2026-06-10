/* THE QUIET ARCHIPELAGO — puzzle mechanic: 'venn-lock'
   The rune lock of the lighthouse: Hamming(7,4) on three overlapping rings.
   Config: { rounds:r, twist:bool }
   Three translucent circles (red/green/blue) in the classic Venn arrangement
   hold 7 rune chips. Parities are set so every ring is even, then ONE bit flips;
   each odd ring outlines red; player clicks the flipped rune. If twist, the
   final round flips TWO runes (the rings then point at the symmetric-difference
   rune) — the lock decodes "as designed, and is deceived."
   Contract: ../../DESIGN.md (schema 8). complete() exactly once; never binds Esc;
   destroy() clears timers; clean re-create. */
(function () {
'use strict';

/* ============================ pure logic ============================ */
/* Verified exhaustively in a scratch node test:
   - encode -> every ring even (empty syndrome)
   - single flip -> exactly the containing rings go odd, unique per position
   - two flips -> the symmetric difference of the two positions' ring membership */

/* Seven regions, 1-based positions:
   1=A∩B (d1) 2=A∩C (d2) 3=B∩C (d3) 4=A∩B∩C (d4)
   5=A only (p1) 6=B only (p2) 7=C only (p3)
   data d1..d4 at 1..4 ; parities p1..p3 at 5..7 */
var RINGS = ['A', 'B', 'C'];
var MEMBER = { 1: ['A', 'B'], 2: ['A', 'C'], 3: ['B', 'C'], 4: ['A', 'B', 'C'], 5: ['A'], 6: ['B'], 7: ['C'] };
/* full parity check for each ring = which positions sit inside that circle */
var CHECK = {
  A: [1, 2, 4, 5],
  B: [1, 3, 4, 6],
  C: [2, 3, 4, 7],
};

/* encode: from data bits at 1..4, fill parities at 5..7 so each ring is even. */
function encode(d) { // d = [d1,d2,d3,d4]
  var code = [0, d[0], d[1], d[2], d[3], 0, 0, 0];
  code[5] = (code[1] + code[2] + code[4]) & 1; // ring A even over {1,2,4}
  code[6] = (code[1] + code[3] + code[4]) & 1; // ring B even over {1,3,4}
  code[7] = (code[2] + code[3] + code[4]) & 1; // ring C even over {2,3,4}
  return code;
}
/* which rings are ODD in code[1..7]. */
function syndrome(code) {
  var out = [];
  for (var i = 0; i < RINGS.length; i++) {
    var r = RINGS[i], ps = CHECK[r], sum = 0;
    for (var j = 0; j < ps.length; j++) sum += code[ps[j]];
    if (sum & 1) out.push(r);
  }
  return out;
}
/* the position whose membership == the odd-ring set (0 = clean, -1 = impossible). */
function positionFromSyndrome(odd) {
  if (odd.length === 0) return 0;
  var key = odd.slice().sort().join('');
  for (var p = 1; p <= 7; p++) {
    if (MEMBER[p].slice().sort().join('') === key) return p;
  }
  return -1;
}

/* ============================ geometry ============================ */
/* Classic three-circle Venn. Region centroids (approx) for placing rune chips. */
var SVG_W = 320, SVG_H = 300, R = 92;
var CX = { A: 132, B: 188, C: 160 };
var CY = { A: 118, B: 118, C: 174 };
/* chip centers per position (tuned to land inside the right lens) */
var CHIP = {
  1: { x: 160, y: 104 },  // A∩B  (top lens)
  2: { x: 124, y: 158 },  // A∩C  (lower-left lens)
  3: { x: 196, y: 158 },  // B∩C  (lower-right lens)
  4: { x: 160, y: 142 },  // A∩B∩C (center)
  5: { x: 104, y: 96 },   // A only (upper-left crescent)
  6: { x: 216, y: 96 },   // B only (upper-right crescent)
  7: { x: 160, y: 210 },  // C only (bottom crescent)
};
var RING_COLOR = { A: '#f87171', B: '#34d399', C: '#38bdf8' }; // red / green / blue
var RING_NAME = { A: 'Ada', B: 'Bea', C: 'Cee' };

/* ============================ style ============================ */
var STYLE_ID = 'vl-style';
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  var s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent =
  '.vl-wrap{display:flex;flex-direction:column;gap:.8rem;align-items:center}' +
  '.vl-rain{color:var(--muted);font-size:.85rem;line-height:1.5;align-self:stretch}' +
  '.vl-rain b{color:var(--blue);font-weight:600}' +
  '.vl-stage{position:relative;width:320px;max-width:100%}' +
  '.vl-svg{width:100%;height:auto;display:block;touch-action:manipulation}' +
  '.vl-circle{transition:stroke-width .15s,filter .15s}' +
  '.vl-circle.vl-odd{filter:drop-shadow(0 0 6px currentColor)}' +
  '.vl-chip{cursor:pointer}' +
  '.vl-chip circle{transition:fill .12s,stroke .12s}' +
  '.vl-chip:hover circle{stroke:var(--yellow)}' +
  '.vl-chip.vl-locked{cursor:default}' +
  '.vl-chip.vl-locked:hover circle{stroke:var(--surface2)}' +
  '.vl-chip.vl-flash circle{fill:var(--green);stroke:var(--green)}' +
  '.vl-chip.vl-reveal circle{fill:var(--red);stroke:var(--red)}' +
  '.vl-shake{animation:vl-shake .4s}' +
  '@keyframes vl-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}' +
    '40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}' +
  '.vl-syn{align-self:stretch;text-align:center;font-size:.85rem;min-height:1.2em;color:var(--muted)}' +
  '.vl-syn b{color:var(--text)}' +
  '.vl-actions{display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center}' +
  '.vl-actions .btn{min-height:44px;min-width:120px}' +
  '.vl-fb{min-height:1.2em;text-align:center;font-size:.9rem;align-self:stretch}' +
  '.vl-fb.vl-good{color:var(--green)}' +
  '.vl-fb.vl-bad{color:var(--yellow)}' +
  '.vl-legend{display:flex;gap:.8rem;flex-wrap:wrap;justify-content:center;font-size:.72rem}' +
  '.vl-legend span{display:inline-flex;align-items:center;gap:.3rem}' +
  '.vl-legend i{width:10px;height:10px;border-radius:50%;display:inline-block}' +
  '.vl-lesson{align-self:stretch;border-left:3px solid var(--green)}' +
  '.vl-lesson h4{color:var(--green);margin-bottom:.4rem;font-size:.95rem}' +
  '.vl-lesson p{font-size:.85rem;line-height:1.55;color:var(--text)}';
  document.head.appendChild(s);
}

/* ============================ mechanic ============================ */
G.puzzles.register('venn-lock', {
  title: 'The Lighthouse Rune Lock',
  create: function (root, config, api) {
    injectStyle();

    var rounds = Math.max(1, (config && config.rounds) || 3);
    var twist = !!(config && config.twist);

    var round = 0;             // 0-based index of current round
    var solved = 0;            // rounds passed
    var timers = [];
    var finished = false;

    /* per-round state */
    var code = [];             // 1-based [0,b1..b7]
    var oddRings = [];         // current syndrome
    var answerPos = 0;         // single-flip answer (0..7); for twist final: indicated rune
    var twoFlip = null;        // [a,b] when a twist double-flip is active
    var answered = false;

    var wrap = document.createElement('div');
    wrap.className = 'vl-wrap';
    root.appendChild(wrap);

    function clearTimers() {
      for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
      timers = [];
    }
    function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }

    function updateStatus() {
      api.status('Rune ring <b style="color:var(--gold)">' + Math.min(round + 1, rounds) +
        '</b> / ' + rounds + (twist ? ' &middot; twist lock' : ''));
    }

    /* element handles for the current board */
    var els = { chips: {}, circles: {}, syn: null, fb: null, stage: null };

    function isTwistRound() { return twist && round === rounds - 1; }

    function newRound() {
      clearTimers();
      answered = false;
      twoFlip = null;

      // random data, parities set so every ring is even
      var d = [api.rng() < .5 ? 0 : 1, api.rng() < .5 ? 0 : 1, api.rng() < .5 ? 0 : 1, api.rng() < .5 ? 0 : 1];
      code = encode(d);

      if (isTwistRound()) {
        // flip TWO distinct runes
        var a = 1 + Math.floor(api.rng() * 7);
        var b;
        do { b = 1 + Math.floor(api.rng() * 7); } while (b === a);
        code[a] ^= 1; code[b] ^= 1;
        twoFlip = [a, b];
        oddRings = syndrome(code);
        // the rings point at the symmetric-difference rune; accept that rune.
        answerPos = positionFromSyndrome(oddRings); // 0 if symdiff empty (can't happen for distinct a,b)
      } else {
        // flip ONE rune
        var f = 1 + Math.floor(api.rng() * 7);
        code[f] ^= 1;
        oddRings = syndrome(code);
        answerPos = f; // single flip: syndrome points exactly here
      }

      renderBoard();
      updateStatus();
    }

    function renderBoard() {
      wrap.innerHTML = '';
      els = { chips: {}, circles: {}, syn: null, fb: null, stage: null };

      var rain = document.createElement('div');
      rain.className = 'vl-rain';
      rain.innerHTML = isTwistRound()
        ? 'The last ring is older than the lighthouse. Rain drums the glass. <b>Two</b> runes wear wrong tonight — set the lock as it was <b>designed</b> to read.'
        : 'Three rings, sworn even. A gust flips one rune; the rings it touches glow <b>red</b>. Click the rune they share.';
      wrap.appendChild(rain);

      var legend = document.createElement('div');
      legend.className = 'vl-legend';
      RINGS.forEach(function (r) {
        var sp = document.createElement('span');
        sp.innerHTML = '<i style="background:' + RING_COLOR[r] + '"></i>' + RING_NAME[r] + ' (' + r + ')';
        legend.appendChild(sp);
      });
      wrap.appendChild(legend);

      var stage = document.createElement('div');
      stage.className = 'vl-stage';
      els.stage = stage;
      stage.innerHTML = buildSvg();
      wrap.appendChild(stage);

      // wire SVG handles
      RINGS.forEach(function (r) {
        var c = stage.querySelector('.vl-circle[data-ring="' + r + '"]');
        els.circles[r] = c;
        if (oddRings.indexOf(r) >= 0) {
          c.classList.add('vl-odd');
          c.setAttribute('stroke-width', '5');
        }
      });
      for (var p = 1; p <= 7; p++) {
        (function (pos) {
          var g = stage.querySelector('.vl-chip[data-pos="' + pos + '"]');
          els.chips[pos] = g;
          g.addEventListener('click', function () { pick(pos); });
        })(p);
      }

      var syn = document.createElement('div');
      syn.className = 'vl-syn';
      els.syn = syn;
      // first round: print the syndrome in words
      if (round === 0 && !isTwistRound()) {
        syn.innerHTML = syndromeWords();
      } else if (isTwistRound()) {
        syn.innerHTML = 'The rings read: ' + ringStateWords() + ' — they point at <b>one</b> rune. Trust the lock.';
      } else {
        syn.innerHTML = ringStateWords();
      }
      wrap.appendChild(syn);

      var fb = document.createElement('div');
      fb.className = 'vl-fb';
      els.fb = fb;
      wrap.appendChild(fb);
    }

    function ringStateWords() {
      return RINGS.map(function (r) {
        var odd = oddRings.indexOf(r) >= 0;
        return 'Ring ' + r + ' ' + (odd ? 'odd' : 'even');
      }).join(' · ');
    }
    function syndromeWords() {
      var where;
      if (oddRings.length === 0) where = 'no rune is wrong';
      else {
        var p = positionFromSyndrome(oddRings);
        where = 'the rune in ' + regionName(p);
      }
      return ringStateWords() + ' → <b>' + where + '</b>.';
    }
    function regionName(pos) {
      var m = MEMBER[pos];
      if (m.length === 3) return 'A∩B∩C (all three)';
      if (m.length === 2) return m[0] + '∩' + m[1] + ' only';
      return m[0] + ' only';
    }

    function buildSvg() {
      var svg = '<svg class="vl-svg" viewBox="0 0 ' + SVG_W + ' ' + SVG_H + '" ' +
        'xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three overlapping rune rings">';
      // translucent fills first (so overlaps blend), then outlines on top
      RINGS.forEach(function (r) {
        svg += '<circle cx="' + CX[r] + '" cy="' + CY[r] + '" r="' + R + '" ' +
          'fill="' + RING_COLOR[r] + '" fill-opacity="0.13" stroke="none"/>';
      });
      RINGS.forEach(function (r) {
        svg += '<circle class="vl-circle" data-ring="' + r + '" cx="' + CX[r] + '" cy="' + CY[r] +
          '" r="' + R + '" fill="none" stroke="' + RING_COLOR[r] + '" stroke-width="2.5" ' +
          'style="color:' + RING_COLOR[r] + '"/>';
      });
      // rune chips
      for (var p = 1; p <= 7; p++) {
        var c = CHIP[p];
        var lab = p <= 4 ? ('d' + p) : ('p' + (p - 4));
        svg += '<g class="vl-chip" data-pos="' + p + '" tabindex="0">' +
          '<circle cx="' + c.x + '" cy="' + c.y + '" r="17" fill="var(--surface)" ' +
            'stroke="var(--surface2)" stroke-width="2"/>' +
          '<text x="' + c.x + '" y="' + (c.y + 6) + '" text-anchor="middle" ' +
            'font-size="17" font-weight="700" fill="var(--text)" style="pointer-events:none">' +
            code[p] + '</text>' +
          '<text x="' + c.x + '" y="' + (c.y + 28) + '" text-anchor="middle" ' +
            'font-size="9" fill="var(--dim)" style="pointer-events:none">' + lab + '</text>' +
          '</g>';
      }
      svg += '</svg>';
      return svg;
    }

    function lockChips() {
      answered = true;
      for (var p = 1; p <= 7; p++) els.chips[p].classList.add('vl-locked');
    }

    function pick(pos) {
      if (answered) return;
      // the correct rune to click:
      //  - normal round: the single flipped position (== answerPos)
      //  - twist round: the rune the rings indicate (symmetric-difference position == answerPos)
      if (pos === answerPos && answerPos !== 0) {
        lockChips();
        els.chips[pos].classList.add('vl-flash');
        api.sfx('select');
        if (isTwistRound()) {
          els.fb.className = 'vl-fb vl-good';
          els.fb.innerHTML = 'The lock decoded as designed — and was deceived. ' +
            'Three rings correct one flip, never two.';
        } else {
          els.fb.className = 'vl-fb vl-good';
          els.fb.textContent = 'The rune turns. ' + (round === 0 ? 'The syndrome named it.' : 'Right.');
        }
        roundWon();
      } else {
        // wrong: shake + reveal the answer briefly
        els.chips[pos].classList.add('vl-shake');
        api.fail();
        lockChips();
        els.fb.className = 'vl-fb vl-bad';
        els.fb.textContent = 'The lock resists. The rings pointed elsewhere…';
        // reveal the intended rune
        if (answerPos > 0) els.chips[answerPos].classList.add('vl-reveal');
        roundLost();
      }
    }

    function roundWon() {
      solved++;
      later(function () {
        round++;
        if (round >= rounds) showLesson();
        else newRound();
      }, isTwistRound() ? 1500 : 950);
    }
    function roundLost() {
      // gentle retry: same round index, fresh flip. never advances, never softlocks.
      later(newRound, 1500);
    }

    function showLesson() {
      clearTimers();
      wrap.innerHTML = '';
      var card = document.createElement('div');
      card.className = 'g-card vl-lesson';
      var h = document.createElement('h4');
      h.textContent = 'Why three rings, why (7,4)';
      card.appendChild(h);
      var p = document.createElement('p');
      p.innerHTML = 'Each ring is one parity check — one yes/no bit of <b>syndrome</b>. With r checks you ' +
        'read 2<sup>r</sup> patterns, and to pin down a single flip among n runes you need a distinct ' +
        'pattern for each rune plus one for “all clean”: <b>n + 1 ≤ 2<sup>r</sup></b>. Three rings give ' +
        '2³ = 8 ≥ 7 + 1, so they correct any single flip among 7 runes — that is Hamming(7,4), four data ' +
        'runes guarded by three. ' + (twist
          ? 'Two flips, though, land on the symmetric difference and wear the mask of a single error: ' +
            'the lock decodes confidently, and wrongly.'
          : 'Two flips would wear the mask of a single error — beyond what three rings can mend.');
      card.appendChild(p);
      var btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.style.minHeight = '44px';
      btn.textContent = 'The lock swings open →';
      btn.addEventListener('click', doComplete);
      card.appendChild(btn);
      wrap.appendChild(card);
    }

    function doComplete() {
      if (finished) return;
      finished = true;
      clearTimers();
      api.complete();
    }

    /* ---- go ---- */
    newRound();

    return {
      destroy: function () { clearTimers(); }
    };
  }
});

})();
