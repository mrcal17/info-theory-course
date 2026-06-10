/* THE QUIET ARCHIPELAGO — puzzle mechanic: 'venn-lock'
   The rune lock of the lighthouse: Hamming(7,4) on three overlapping rings.
   Config: { rounds:r, twist:bool }
   Three translucent circles (red/green/blue) in the classic Venn arrangement
   hold 7 rune chips. Parities are set so every ring is even, then ONE bit flips;
   each odd ring outlines red; player clicks the flipped rune. If twist, the
   final round flips TWO runes (the rings then point at the symmetric-difference
   rune) — the lock decodes "as designed, and is deceived."
   PEDAGOGY.md §6.8: hook (2³ = 8 patterns), a decoder table that fills in as
   rounds are solved, hint ladder, post-deception beat, debrief via G.pz with
   the completed table. First click must be right; a wrong click resets the
   round with a fresh flip. Repeats (G.pz.taught) skip hook + guided round.
   Contract: ../../DESIGN.md (schema 8). complete() exactly once; never binds Esc;
   destroy() clears timers; clean re-create. */
(function () {
'use strict';

/* ============================ pure logic ============================ */
/* Verified in _smoke/pz_test_venn-lock.mjs:
   - encode -> every ring even (empty syndrome)
   - single flip -> exactly the containing rings go odd, unique per position
     (7 flips cover all 7 non-empty ring subsets: table completeness)
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
/* decoder-table rows in display order; key = sorted odd-ring letters, '' = clean */
var PATTERNS = [
  { key: 'A',   pos: 5 },
  { key: 'B',   pos: 6 },
  { key: 'C',   pos: 7 },
  { key: 'AB',  pos: 1 },
  { key: 'AC',  pos: 2 },
  { key: 'BC',  pos: 3 },
  { key: 'ABC', pos: 4 },
  { key: '',    pos: 0 },
];

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

function chipLab(pos) { return pos <= 4 ? ('d' + pos) : ('p' + (pos - 4)); }
function regionShort(pos) {
  var m = MEMBER[pos];
  return m.length === 1 ? (m[0] + ' only') : m.join('∩');
}

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
  '.vl-main{display:flex;gap:.9rem;flex-wrap:wrap;justify-content:center;align-items:flex-start;align-self:stretch}' +
  '.vl-stage{position:relative;width:380px;max-width:100%}' +
  '.vl-svg{width:100%;height:auto;display:block;touch-action:manipulation}' +
  '.vl-circle{transition:stroke-width .15s,filter .15s}' +
  '.vl-circle.vl-odd{filter:drop-shadow(0 0 6px currentColor)}' +
  '.vl-chip{cursor:pointer}' +
  '.vl-chip circle{transition:fill .12s,stroke .12s}' +
  '.vl-chip:hover .vl-face{stroke:var(--yellow)}' +
  '.vl-chip.vl-locked{cursor:default}' +
  '.vl-chip.vl-locked:hover .vl-face{stroke:var(--surface2)}' +
  '.vl-chip.vl-flash .vl-face{fill:var(--green);stroke:var(--green)}' +
  '.vl-chip.vl-reveal .vl-face{fill:var(--red);stroke:var(--red)}' +
  '.vl-shake{animation:vl-shake .4s}' +
  '@keyframes vl-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}' +
    '40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}' +
  /* decoder table */
  '.vl-table{flex:0 0 auto;border:1px solid var(--surface2);border-radius:10px;' +
    'padding:.55rem .7rem;background:var(--surface);display:flex;flex-direction:column;gap:.18rem;min-width:172px}' +
  '.vl-tt{font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);font-weight:700}' +
  '.vl-ts{font-size:.68rem;color:var(--dim);margin-bottom:.2rem}' +
  '.vl-trow{display:flex;align-items:center;gap:.5rem;font-size:.8rem;padding:.14rem .35rem;' +
    'border-radius:6px;border:1px solid transparent;color:var(--text)}' +
  '.vl-trow.vl-cur{border-color:var(--gold);background:rgba(250,204,21,.07)}' +
  '.vl-trow.vl-just{background:rgba(52,211,153,.14)}' +
  '.vl-trow .vl-tlab b{color:var(--gold)}' +
  '.vl-trow .vl-unk{color:var(--dim)}' +
  '.vl-trow.vl-ghost .vl-tlab,.vl-trow.vl-ghost .vl-tlab b{color:var(--muted);font-style:italic}' +
  '.vl-dots{display:inline-flex;gap:.28rem;align-items:center}' +
  '.vl-dot{width:11px;height:11px;border-radius:50%;border:2px solid;display:inline-block}' +
  '.vl-arr{color:var(--dim)}' +
  '.vl-syn{align-self:stretch;text-align:center;font-size:.85rem;min-height:1.2em;color:var(--muted)}' +
  '.vl-syn b{color:var(--text)}' +
  '.vl-actions{display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center;align-self:stretch}' +
  '.vl-actions .btn{min-height:44px;min-width:120px}' +
  '.vl-fb{min-height:1.2em;text-align:center;font-size:.9rem;align-self:stretch}' +
  '.vl-fb.vl-good{color:var(--green)}' +
  '.vl-fb.vl-bad{color:var(--yellow)}' +
  '.vl-legend{display:flex;gap:.8rem;flex-wrap:wrap;justify-content:center;font-size:.72rem}' +
  '.vl-legend span{display:inline-flex;align-items:center;gap:.3rem}' +
  '.vl-legend i{width:10px;height:10px;border-radius:50%;display:inline-block}' +
  '.vl-coach,.vl-banner,.vl-hook{align-self:stretch}' +
  '.vl-debrief{align-self:stretch}' +
  '.vl-debrief .vl-table{margin:.4rem 0;align-self:flex-start}';
  document.head.appendChild(s);
}

/* ============================ mechanic ============================ */
G.puzzles.register('venn-lock', {
  title: 'The Lighthouse Rune Lock',

  /* exposed for the scratch logic test (_smoke/pz_test_venn-lock.mjs) only */
  _logic: { encode: encode, syndrome: syndrome, positionFromSyndrome: positionFromSyndrome,
            MEMBER: MEMBER, CHECK: CHECK, PATTERNS: PATTERNS },

  create: function (root, config, api) {
    injectStyle();

    var rounds = Math.max(1, (config && config.rounds) || 3);
    var twist = !!(config && config.twist);
    var wasTaught = G.pz.taught('venn-lock'); // repeats: skip hook + guided round

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

    /* session decoder table: patternKey -> true. Clean row known from the hook. */
    var discovered = { '': true };
    var lastNew = null;        // pattern key just added (flash once on next render)
    var playerRows = 0;        // non-clean rows the player filled (for the debrief)

    /* hint ladder (PEDAGOGY §1.7) — third rung walks the player through. */
    var WALK = '__vl_walk__';
    var ladder = G.pz.hintLadder([
      'Guessing resets the lock. Every glowing ring <b>contains</b> the wrong rune — start from the glow.',
      'Calm rings speak too: the wrong rune sits inside every glowing ring and <b>outside</b> every calm one. Exactly one region fits — and your decoder table remembers the ones you’ve solved.',
      WALK,
    ]);
    var pendingHint = null;

    var wrap = document.createElement('div');
    wrap.className = 'vl-wrap';
    root.appendChild(wrap);

    function clearTimers() {
      for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
      timers = [];
    }
    function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }

    function tableCount() {
      var n = 0;
      for (var i = 0; i < PATTERNS.length; i++) if (PATTERNS[i].key && discovered[PATTERNS[i].key]) n++;
      return n;
    }
    function updateStatus() {
      api.status('Rune ring <b style="color:var(--gold)">' + Math.min(round + 1, rounds) +
        '</b> / ' + rounds + ' &middot; decoder ' + tableCount() + '/7' +
        (twist ? ' &middot; twist lock' : ''));
    }

    /* element handles for the current board */
    var els = { chips: {}, circles: {}, syn: null, fb: null, stage: null };

    function isTwistRound() { return twist && round === rounds - 1; }
    function synKey() { return oddRings.slice().sort().join(''); }

    /* ---------------- HOOK (first encounter only) ---------------- */
    function showHook() {
      wrap.innerHTML = '';
      var hookDone = false;
      var hook = G.pz.hookCard({
        question: 'Three rings, each only says EVEN or ODD — how many distinct alarm patterns can they show?',
        options: [{ label: '4' }, { label: '7' }, { label: '8' }],
        correct: 2,
        reveal: 'Each ring is one yes/no: 2 × 2 × 2 = <b>2³ = 8</b> patterns. Seven can each name one rune — and the eighth is spare, for <b>all clean</b>.',
        doneLabel: 'To the lock',
        onDone: function () {
          if (hookDone) return;
          hookDone = true;
          newRound();
        },
      });
      hook.classList.add('vl-hook');
      wrap.appendChild(hook);
      api.status('the old rune lock');
    }

    /* ---------------- rounds ---------------- */
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

      var banner = G.pz.roundBanner(round + 1, rounds,
        isTwistRound() ? 'the old ring' : (round === 0 && !wasTaught ? 'read the rings' : 'read the rings yourself'));
      banner.classList.add('vl-banner');
      wrap.appendChild(banner);

      var rain = document.createElement('div');
      rain.className = 'vl-rain';
      rain.innerHTML = isTwistRound()
        ? 'The last ring is older than the lighthouse. Rain drums the glass. <b>Two</b> runes wear wrong tonight — set the lock as it was <b>designed</b> to read.'
        : 'Three rings, sworn even. A gust flips one rune; the rings it touches glow <b>red</b>. Click the rune they share — first click must be right, or the lock re-randomizes.';
      wrap.appendChild(rain);

      var legend = document.createElement('div');
      legend.className = 'vl-legend';
      RINGS.forEach(function (r) {
        var sp = document.createElement('span');
        sp.innerHTML = '<i style="background:' + RING_COLOR[r] + '"></i>' + RING_NAME[r] + ' (' + r + ')';
        legend.appendChild(sp);
      });
      wrap.appendChild(legend);

      var main = document.createElement('div');
      main.className = 'vl-main';
      var stage = document.createElement('div');
      stage.className = 'vl-stage';
      els.stage = stage;
      stage.innerHTML = buildSvg();
      main.appendChild(stage);
      main.appendChild(buildTable(false, synKey()));
      wrap.appendChild(main);

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
      // guided first round (first encounter only): print the deduction in words
      if (round === 0 && !wasTaught && !isTwistRound()) {
        syn.innerHTML = syndromeWords();
      } else if (isTwistRound()) {
        syn.innerHTML = 'The rings read: ' + ringStateWords() + ' — they point at <b>one</b> rune. Trust the lock.';
      } else {
        syn.innerHTML = ringStateWords();
      }
      wrap.appendChild(syn);

      // coach: one card at most — a hint after failures, else the guide line once
      if (pendingHint) {
        var hintHtml = pendingHint === WALK
          ? 'Read it off: the glow names <b>' + regionName(answerPos) + '</b> — click <b>' + chipLab(answerPos) + '</b>.'
          : pendingHint;
        var hc = G.pz.coachCard('cee', hintHtml);
        hc.classList.add('vl-coach');
        wrap.appendChild(hc);
        pendingHint = null;
      } else if (round === 0 && !wasTaught && !isTwistRound()) {
        var cc = G.pz.coachCard('cee',
          'Each ring counts the runes it holds — odd count, red glow. A flip trips <b>exactly</b> the rings that hold it: the pattern is its name. The decoder remembers each one you catch.');
        cc.classList.add('vl-coach');
        wrap.appendChild(cc);
      }
      lastNew = null;

      var fb = document.createElement('div');
      fb.className = 'vl-fb';
      els.fb = fb;
      wrap.appendChild(fb);
    }

    /* ---------------- decoder table ---------------- */
    /* fillAll=true (debrief): complete the table; rows the player never solved
       render ghosted. curKey highlights the live syndrome's row. */
    function buildTable(fillAll, curKey) {
      var t = document.createElement('div');
      t.className = 'vl-table';
      t.innerHTML = '<div class="vl-tt">Decoder</div>' +
        '<div class="vl-ts">odd rings → flipped rune</div>';
      PATTERNS.forEach(function (row) {
        var div = document.createElement('div');
        div.className = 'vl-trow';
        if (!fillAll && curKey === row.key) div.classList.add('vl-cur');
        if (!fillAll && lastNew === row.key) div.classList.add('vl-just');
        var known = !!discovered[row.key];
        if (fillAll && !known) div.classList.add('vl-ghost');
        var dots = '<span class="vl-dots">';
        RINGS.forEach(function (r) {
          var odd = row.key.indexOf(r) >= 0;
          dots += '<i class="vl-dot" style="border-color:' + RING_COLOR[r] +
            ';background:' + (odd ? RING_COLOR[r] : 'transparent') + '"></i>';
        });
        dots += '</span>';
        var lab;
        if (known || fillAll) {
          lab = row.pos === 0 ? 'all clean'
            : '<b>' + chipLab(row.pos) + '</b> · ' + regionShort(row.pos);
        } else {
          lab = '<span class="vl-unk">?</span>';
        }
        div.innerHTML = dots + '<span class="vl-arr">→</span><span class="vl-tlab">' + lab + '</span>';
        t.appendChild(div);
      });
      return t;
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
      // rune chips (invisible r=19 hit circle under the r=17 face; stage is
      // 380px wide for a 320 viewBox, so the touch target renders ≥ 42px)
      for (var p = 1; p <= 7; p++) {
        var c = CHIP[p];
        svg += '<g class="vl-chip" data-pos="' + p + '" tabindex="0">' +
          '<circle cx="' + c.x + '" cy="' + c.y + '" r="19" fill="rgba(0,0,0,0)" stroke="none"/>' +
          '<circle class="vl-face" cx="' + c.x + '" cy="' + c.y + '" r="17" fill="var(--surface)" ' +
            'stroke="var(--surface2)" stroke-width="2"/>' +
          '<text x="' + c.x + '" y="' + (c.y + 6) + '" text-anchor="middle" ' +
            'font-size="17" font-weight="700" fill="var(--text)" style="pointer-events:none">' +
            code[p] + '</text>' +
          '<text x="' + c.x + '" y="' + (c.y + 28) + '" text-anchor="middle" ' +
            'font-size="9" fill="var(--dim)" style="pointer-events:none">' + chipLab(p) + '</text>' +
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
      // GATE (no guessing): the FIRST rune clicked must be the indicated one —
      //  - normal round: the single flipped position (== answerPos)
      //  - twist round: the rune the rings indicate (symmetric-difference position)
      // anything else resets the round with a fresh flip.
      if (pos === answerPos && answerPos !== 0) {
        lockChips();
        els.chips[pos].classList.add('vl-flash');
        api.sfx('select');
        ladder.reset();
        var key = synKey();
        if (!discovered[key]) { discovered[key] = true; lastNew = key; playerRows++; }
        updateStatus();
        if (isTwistRound()) {
          els.fb.className = 'vl-fb vl-good';
          els.fb.innerHTML = 'The lock decoded as designed — and was deceived. ' +
            'Three rings correct one flip, never two.';
          solved++;
          later(showTwistBeat, 1200);
        } else {
          els.fb.className = 'vl-fb vl-good';
          els.fb.textContent = 'The rune turns. ' + (round === 0 && !wasTaught ? 'The syndrome named it.' : 'Right.');
          roundWon();
        }
      } else {
        // wrong first click: shake + reveal, then a FRESH flip on the same round
        els.chips[pos].classList.add('vl-shake');
        api.fail();
        lockChips();
        els.fb.className = 'vl-fb vl-bad';
        els.fb.textContent = 'The lock resists and re-randomizes. The rings pointed elsewhere…';
        if (answerPos > 0) els.chips[answerPos].classList.add('vl-reveal');
        pendingHint = ladder.fail();
        roundLost();
      }
    }

    function roundWon() {
      solved++;
      later(function () {
        round++;
        if (round >= rounds) showDebrief();
        else newRound();
      }, 950);
    }
    function roundLost() {
      // gentle retry: same round index, fresh flip. never advances, never softlocks.
      later(newRound, 1400);
    }

    /* ---------------- twist beat (post-deception, one tap) ---------------- */
    function showTwistBeat() {
      var beat = G.pz.coachCard('cee',
        'How many flips can a code <b>catch-and-fix</b>? Every fix needs a spare pattern — one per place a flip could hide. Eight patterns: seven runes, plus clean. <b>Exactly enough for one.</b>');
      beat.classList.add('vl-coach');
      wrap.appendChild(beat);
      var row = document.createElement('div');
      row.className = 'vl-actions';
      var btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = 'Hold that thought →';
      btn.addEventListener('click', showDebrief);
      row.appendChild(btn);
      wrap.appendChild(row);
      try { btn.scrollIntoView({ block: 'nearest' }); } catch (e) {}
    }

    /* ---------------- debrief (PEDAGOGY §1.5) ---------------- */
    function showDebrief() {
      clearTimers();
      wrap.innerHTML = '';
      var cc = G.pz.coachCard('cee', '“Three frowns, eight answers. You never guessed — you read.”');
      cc.classList.add('vl-coach');
      wrap.appendChild(cc);

      var tableHtml = buildTable(true, null).outerHTML;
      var html = 'Your decoder, completed — you filled <b>' + Math.min(playerRows, 7) +
        ' of 7</b> rows at the lock:' + tableHtml +
        'The count from the door is the whole design: <span class="pzk-eq">2³ = 8 = 7 runes + all-clean</span> — ' +
        'one pattern per single flip, with none left over (<span class="pzk-eq">n + 1 ≤ 2<sup>r</sup></span>). ' +
        'That counting argument <b>is</b> Hamming(7,4): four data runes guarded by three ring-checks. ' +
        (twist
          ? 'And the old ring’s trick: a <b>second</b> flip lands on another single-flip row of this same table — the lock decodes confidently, and wrongly. Fixing two flips would need spare rows that eight patterns cannot spare.'
          : 'Two flips would land on another row of this same table — wearing the mask of a single error, beyond what three rings can mend.');

      var card = G.pz.debriefCard({
        title: 'Why three rings, why (7,4)',
        html: html,
        tone: 'win',
        buttonLabel: 'The lock swings open →',
        onButton: doComplete,
      });
      card.classList.add('vl-debrief');
      wrap.appendChild(card);
    }

    function doComplete() {
      if (finished) return;
      finished = true;
      clearTimers();
      G.pz.markTaught('venn-lock');
      api.complete();
    }

    /* ---- go ---- */
    if (wasTaught) newRound();
    else showHook();

    return {
      destroy: function () { clearTimers(); }
    };
  }
});

})();
