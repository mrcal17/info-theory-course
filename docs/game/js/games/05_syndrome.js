/* SIGNAL LOST — Syndrome. Hamming(7,4) error correction on the Venn diagram.
   Contract: ../../DESIGN.md. Single-file IIFE, no globals but Game.register. */
(function () {
'use strict';

/* =====================================================================
   PURE MATH (no DOM, no state) — the actual coding theory.
   Bit order is fixed: [d1, d2, d3, d4, p1, p2, p3].
   Circle membership of each region (which of A,B,C contain the bit):
     p1 = A only        -> {A}
     p2 = B only        -> {B}
     p3 = C only        -> {C}
     d1 = A∩B not C     -> {A,B}
     d2 = A∩C not B     -> {A,C}
     d3 = B∩C not A     -> {B,C}
     d4 = A∩B∩C         -> {A,B,C}
   These are the 7 non-empty subsets of {A,B,C}; that is exactly why the
   3-bit syndrome (one parity per circle) can name all 7 error positions.
   ===================================================================== */

var BITS = ['d1', 'd2', 'd3', 'd4', 'p1', 'p2', 'p3'];
var CIRCLES = ['A', 'B', 'C'];

/* membership[bit] = array of circles the bit lies in */
var MEMBERSHIP = {
  d1: ['A', 'B'],
  d2: ['A', 'C'],
  d3: ['B', 'C'],
  d4: ['A', 'B', 'C'],
  p1: ['A'],
  p2: ['B'],
  p3: ['C']
};

/* which bits live inside each circle */
var CIRCLE_BITS = {
  A: ['p1', 'd1', 'd2', 'd4'],
  B: ['p2', 'd1', 'd3', 'd4'],
  C: ['p3', 'd2', 'd3', 'd4']
};

function inCircle(bit, circle) {
  return MEMBERSHIP[bit].indexOf(circle) >= 0;
}

/* parity (0 even / 1 odd) of the bits inside one circle */
function circleParity(bits, circle) {
  var s = 0, members = CIRCLE_BITS[circle], i;
  for (i = 0; i < members.length; i++) s ^= bits[members[i]];
  return s & 1;
}

/* syndrome = {A:0|1, B:0|1, C:0|1} — odd circles are the lit ones */
function syndrome(bits) {
  return { A: circleParity(bits, 'A'), B: circleParity(bits, 'B'), C: circleParity(bits, 'C') };
}

/* encode: given the 4 data bits, choose parity bits so every circle is even.
   Each parity bit sits alone in exactly one circle, so it equals the parity
   of that circle's data bits. data = {d1,d2,d3,d4} of 0/1. */
function encode(data) {
  var bits = {
    d1: data.d1 & 1, d2: data.d2 & 1, d3: data.d3 & 1, d4: data.d4 & 1,
    p1: 0, p2: 0, p3: 0
  };
  bits.p1 = (bits.d1 ^ bits.d2 ^ bits.d4) & 1; /* circle A even */
  bits.p2 = (bits.d1 ^ bits.d3 ^ bits.d4) & 1; /* circle B even */
  bits.p3 = (bits.d2 ^ bits.d3 ^ bits.d4) & 1; /* circle C even */
  return bits;
}

/* the bit whose membership exactly equals the lit circles, or null if clean.
   This is the standard Hamming decode: the syndrome names one position. */
function syndromeToBit(syn) {
  var lit = CIRCLES.filter(function (c) { return syn[c]; });
  if (lit.length === 0) return null;
  for (var i = 0; i < BITS.length; i++) {
    var b = BITS[i], m = MEMBERSHIP[b];
    if (m.length === lit.length && lit.every(function (c) { return m.indexOf(c) >= 0; })) return b;
  }
  return null; /* unreachable: every non-empty subset is some bit */
}

function flipBit(bits, bit) {
  var out = {}, i;
  for (i = 0; i < BITS.length; i++) out[BITS[i]] = bits[BITS[i]];
  out[bit] = out[bit] ^ 1;
  return out;
}

/* symmetric difference of two bits' memberships, as the bit occupying it.
   For a 2-error pattern this is the position the decoder is fooled into. */
function symmetricDifferenceBit(bitX, bitY) {
  var mx = MEMBERSHIP[bitX], my = MEMBERSHIP[bitY];
  var lit = CIRCLES.filter(function (c) {
    return (mx.indexOf(c) >= 0) !== (my.indexOf(c) >= 0);
  });
  if (lit.length === 0) return null; /* same region — impossible for distinct bits */
  for (var i = 0; i < BITS.length; i++) {
    var b = BITS[i], m = MEMBERSHIP[b];
    if (m.length === lit.length && lit.every(function (c) { return m.indexOf(c) >= 0; })) return b;
  }
  return null;
}

/* =====================================================================
   REGISTRATION
   ===================================================================== */

Game.register({
  id: 'syndrome',
  title: 'Syndrome',
  icon: '🧬',
  part: 4,
  module: '4A',
  moduleTitle: 'Linear Codes & Hamming',
  moduleUrl: '../4a_linear_codes/',
  tagline: 'Three parity rings light up; read them and pull the lying bit.',

  briefing:
    '<p>Corrupted frames are coming off the wire faster than the buffer can ' +
    'hold. Each is a Hamming(7,4) block laid across three parity rings — and ' +
    'each ring keeps its bits balanced. Noise flips a bit; the rings that go ' +
    'out of balance glow red. That red pattern is the <em>syndrome</em>, and ' +
    'it points straight at the bit that lied.</p>' +
    '<ul>' +
    '<li>Each circle should hold an <b>even</b> number of 1s. Red outline = odd = something flipped inside.</li>' +
    '<li>Click the single bit that lies in <em>exactly</em> the red circles (and no green ones).</li>' +
    '<li>8 rounds, a gentle ~25s timer each. Answer fast for a speed bonus.</li>' +
    '<li>Late rounds turn nasty: the wire flips <b>two</b> bits at once. Decode anyway — and watch the code lie back.</li>' +
    '</ul>',

  concept:
    '<p>The three circles are three <b>parity-check equations</b>. Each one ' +
    'sums its bits mod 2; together they form the rows of the check matrix H. ' +
    'For a received word, the three checks give a 3-bit <b>syndrome</b> — and ' +
    'because the seven bit-positions occupy the seven non-empty subsets of ' +
    '{A,B,C}, every single-bit error produces a different syndrome that ' +
    '<em>is</em> the address of the flipped bit.</p>' +
    '<p>The code has minimum distance d<sub>min</sub> = 3, so it corrects ' +
    '⌊(3−1)/2⌋ = 1 error. Two errors share a coset with a single error: the ' +
    'syndrome of {x,y} equals the syndrome of the one bit in their symmetric ' +
    'difference, so the decoder "corrects" the wrong bit — confidently, and ' +
    'wrong. That is the price of stopping at distance 3.</p>',

  create: function (root, api) {
    /* -------------------- per-run state (reset every create) -------------------- */
    var ROUNDS = 8;
    var TIMER_MS = 25000;
    var TICK_MS = 100;

    var round = 0;            // 1-based once a round starts
    var correctCount = 0;
    var speedBonus = 0;       // accumulated, capped later
    var resolved = false;     // current round answered/timed out
    var log = [];             // per-round records for the debrief table
    var completed = false;    // guards api.complete

    var cur = null;           // current round model
    var timerId = null;       // setInterval handle for the timer bar
    var advanceId = null;     // setTimeout handle between rounds
    var startTime = 0;

    /* -------------------- styles -------------------- */
    api.injectStyle(
      '.sy-wrap{display:flex;flex-direction:column;gap:0.9rem;align-items:center;}' +
      '.sy-top{width:100%;max-width:460px;display:flex;flex-direction:column;gap:0.5rem;}' +
      '.sy-prompt{text-align:center;color:var(--muted);font-size:0.92rem;line-height:1.5;min-height:2.6em;}' +
      '.sy-prompt b{color:var(--text);}' +
      '.sy-read{font-family:ui-monospace,Consolas,monospace;font-size:0.86rem;color:var(--orange);text-align:center;}' +
      '.sy-timer{height:8px;background:var(--surface2);border-radius:4px;overflow:hidden;}' +
      '.sy-timer-fill{height:100%;background:var(--green);border-radius:4px;width:100%;transition:width 0.1s linear;}' +
      '.sy-timer-fill.low{background:var(--yellow);}' +
      '.sy-timer-fill.crit{background:var(--red);}' +
      '.sy-venn{width:100%;max-width:460px;touch-action:manipulation;display:block;}' +
      '.sy-ring{fill-opacity:0.10;stroke-width:5;transition:stroke 0.2s,fill-opacity 0.2s;}' +
      '.sy-ring.odd{stroke:var(--red);fill-opacity:0.18;}' +
      '.sy-ring.even{stroke:var(--green);}' +
      '.sy-clabel{font:700 16px ui-monospace,Consolas,monospace;fill:var(--muted);text-anchor:middle;}' +
      '.sy-chip{cursor:pointer;}' +
      '.sy-chip .sy-disc{fill:var(--surface);stroke:var(--border);stroke-width:2;transition:fill 0.15s,stroke 0.15s;}' +
      '.sy-chip:hover .sy-disc{stroke:var(--blue);}' +
      '.sy-chip .sy-val{font:700 20px ui-monospace,Consolas,monospace;fill:var(--text);text-anchor:middle;dominant-baseline:central;pointer-events:none;}' +
      '.sy-chip .sy-tag{font:600 9px ui-monospace,Consolas,monospace;fill:var(--dim);text-anchor:middle;pointer-events:none;}' +
      '.sy-chip.lock{cursor:default;}' +
      '.sy-chip.lock:hover .sy-disc{stroke:var(--border);}' +
      '.sy-chip.good .sy-disc{fill:#064e3b;stroke:var(--green);}' +
      '.sy-chip.bad .sy-disc{fill:#7f1d1d;stroke:var(--red);}' +
      '.sy-chip.reveal .sy-disc{stroke:var(--green);stroke-width:3;}' +
      '.sy-chip.flip .sy-disc{stroke:var(--yellow);stroke-dasharray:4 3;}' +
      '.sy-foot{text-align:center;color:var(--dim);font-size:0.82rem;min-height:1.4em;line-height:1.5;}' +
      '.sy-foot b{color:var(--text);}' +
      '@media(max-width:420px){.sy-prompt{font-size:0.86rem;}}'
    );

    /* -------------------- build DOM scaffold -------------------- */
    var wrap = document.createElement('div');
    wrap.className = 'sy-wrap';

    var top = document.createElement('div');
    top.className = 'sy-top';
    var promptEl = document.createElement('div');
    promptEl.className = 'sy-prompt';
    var readEl = document.createElement('div');
    readEl.className = 'sy-read';
    var timerEl = document.createElement('div');
    timerEl.className = 'sy-timer';
    var timerFill = document.createElement('div');
    timerFill.className = 'sy-timer-fill';
    timerEl.appendChild(timerFill);
    top.appendChild(promptEl);
    top.appendChild(readEl);
    top.appendChild(timerEl);
    wrap.appendChild(top);

    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'sy-venn');
    svg.setAttribute('viewBox', '0 0 320 300');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Hamming(7,4) Venn diagram');
    wrap.appendChild(svg);

    var footEl = document.createElement('div');
    footEl.className = 'sy-foot';
    wrap.appendChild(footEl);

    root.appendChild(wrap);

    /* circle geometry (three overlapping circles, classic Venn) */
    var R = 95;
    var GEO = {
      A: { cx: 130, cy: 110, color: 'var(--orange)' },
      B: { cx: 190, cy: 110, color: 'var(--blue)' },
      C: { cx: 160, cy: 165, color: 'var(--purple)' }
    };

    /* chip centers, one per region, placed by hand inside the right area */
    var POS = {
      p1: { x: 95, y: 95 },   // A only (left)
      p2: { x: 225, y: 95 },  // B only (right)
      p3: { x: 160, y: 215 }, // C only (bottom)
      d1: { x: 160, y: 80 },  // A∩B (top center)
      d2: { x: 112, y: 150 }, // A∩C (lower left)
      d3: { x: 208, y: 150 }, // B∩C (lower right)
      d4: { x: 160, y: 130 }  // A∩B∩C (center)
    };

    var ringEls = {};
    var chipEls = {};   // bit -> { g, val, disc }

    function buildSvg() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      CIRCLES.forEach(function (c) {
        var g = GEO[c];
        var circ = document.createElementNS(svgNS, 'circle');
        circ.setAttribute('class', 'sy-ring');
        circ.setAttribute('cx', g.cx);
        circ.setAttribute('cy', g.cy);
        circ.setAttribute('r', R);
        circ.setAttribute('fill', g.color);
        circ.setAttribute('stroke', g.color);
        svg.appendChild(circ);
        ringEls[c] = circ;
      });

      /* circle name labels, pushed to the outer edge of each circle */
      var labelPos = { A: { x: 60, y: 70 }, B: { x: 260, y: 70 }, C: { x: 160, y: 270 } };
      CIRCLES.forEach(function (c) {
        var t = document.createElementNS(svgNS, 'text');
        t.setAttribute('class', 'sy-clabel');
        t.setAttribute('x', labelPos[c].x);
        t.setAttribute('y', labelPos[c].y);
        t.textContent = c;
        svg.appendChild(t);
      });

      BITS.forEach(function (bit) {
        var p = POS[bit];
        var g = document.createElementNS(svgNS, 'g');
        g.setAttribute('class', 'sy-chip');
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');

        var disc = document.createElementNS(svgNS, 'circle');
        disc.setAttribute('class', 'sy-disc');
        disc.setAttribute('cx', p.x);
        disc.setAttribute('cy', p.y);
        disc.setAttribute('r', 20); /* 40px diameter touch target */
        g.appendChild(disc);

        var val = document.createElementNS(svgNS, 'text');
        val.setAttribute('class', 'sy-val');
        val.setAttribute('x', p.x);
        val.setAttribute('y', p.y - 2);
        g.appendChild(val);

        var tag = document.createElementNS(svgNS, 'text');
        tag.setAttribute('class', 'sy-tag');
        tag.setAttribute('x', p.x);
        tag.setAttribute('y', p.y + 14);
        tag.textContent = bit;
        g.appendChild(tag);

        (function (b) {
          function pick() { onPick(b); }
          g.addEventListener('click', pick);
          g.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); }
          });
        })(bit);

        svg.appendChild(g);
        chipEls[bit] = { g: g, val: val, disc: disc };
      });
    }

    /* -------------------- rendering one round -------------------- */
    function randBit() { return api.rng() < 0.5 ? 1 : 0; }
    function pickIndex(n) { return Math.floor(api.rng() * n); }

    function makeRound(n) {
      var data = { d1: randBit(), d2: randBit(), d3: randBit(), d4: randBit() };
      var clean = encode(data);
      var twoFlip = n >= 7;
      var flips, received, syn, pointed, truth;

      if (!twoFlip) {
        var f = BITS[pickIndex(BITS.length)];
        flips = [f];
        received = flipBit(clean, f);
        syn = syndrome(received);
        pointed = syndromeToBit(syn);
        truth = f;                 // the bit the player should click
      } else {
        var i1 = pickIndex(BITS.length);
        var i2;
        do { i2 = pickIndex(BITS.length); } while (i2 === i1);
        var fa = BITS[i1], fb = BITS[i2];
        flips = [fa, fb];
        received = flipBit(flipBit(clean, fa), fb);
        syn = syndrome(received);
        pointed = syndromeToBit(syn);  // a third, WRONG bit
        truth = pointed;               // "correct" = decode as the code does
      }

      return {
        n: n, twoFlip: twoFlip, clean: clean, received: received,
        flips: flips, syn: syn, pointed: pointed, truth: truth
      };
    }

    function renderBits(model) {
      BITS.forEach(function (bit) {
        var c = chipEls[bit];
        c.val.textContent = String(model.received[bit]);
        c.g.setAttribute('class', 'sy-chip');
      });
    }

    function renderRings(model) {
      CIRCLES.forEach(function (c) {
        var odd = model.syn[c] === 1;
        ringEls[c].setAttribute('class', 'sy-ring ' + (odd ? 'odd' : 'even'));
      });
    }

    function syndromeText(model) {
      var parts = CIRCLES.map(function (c) {
        return c + ' ' + (model.syn[c] ? 'odd' : 'even');
      });
      var tgt = model.pointed ? regionPhrase(model.pointed) : 'no error';
      return parts.join(' · ') + ' → the bit in ' + tgt;
    }

    function regionPhrase(bit) {
      var m = MEMBERSHIP[bit];
      if (m.length === 1) return m[0] + ' only';
      if (m.length === 3) return 'A∩B∩C (center)';
      return m[0] + '∩' + m[1] + ' only';
    }

    function startRound() {
      round += 1;
      resolved = false;
      cur = makeRound(round);
      renderBits(cur);
      renderRings(cur);

      var lit = CIRCLES.filter(function (c) { return cur.syn[c]; });
      var litStr = lit.length ? lit.join(' + ') + ' glowing red' : 'all rings green';

      promptEl.innerHTML = (cur.twoFlip
        ? '<b>Heavy corruption.</b> Decode the syndrome — click the bit it points to.'
        : 'One bit flipped. Click the bit lying in <b>exactly</b> the red circles.');

      readEl.textContent = (round <= 2 && !cur.twoFlip) ? syndromeText(cur) : '';

      footEl.innerHTML = 'Round ' + round + ' / ' + ROUNDS + ' — ' + litStr + '.';

      api.status('Round ' + round + '/' + ROUNDS + ' · ' + correctCount + ' correct');

      startTimer();
    }

    /* -------------------- timer -------------------- */
    function startTimer() {
      startTime = Date.now();
      clearTimer();
      timerFill.style.width = '100%';
      timerFill.className = 'sy-timer-fill';
      timerId = setInterval(function () {
        var elapsed = Date.now() - startTime;
        var frac = 1 - elapsed / TIMER_MS;
        if (frac < 0) frac = 0;
        timerFill.style.width = (frac * 100).toFixed(1) + '%';
        timerFill.className = 'sy-timer-fill' + (frac < 0.18 ? ' crit' : frac < 0.4 ? ' low' : '');
        if (elapsed >= TIMER_MS) {
          clearTimer();
          if (!resolved) resolveRound(null, true);
        }
      }, TICK_MS);
    }

    function clearTimer() {
      if (timerId !== null) { clearInterval(timerId); timerId = null; }
    }

    /* -------------------- answering -------------------- */
    function onPick(bit) {
      if (resolved || !cur) return;
      api.sfx('click');
      resolveRound(bit, false);
    }

    function resolveRound(picked, timedOut) {
      if (resolved) return;
      resolved = true;
      clearTimer();

      var elapsed = Date.now() - startTime;
      var fast = !timedOut && elapsed < TIMER_MS / 2;
      var correct = !timedOut && picked === cur.truth;

      if (correct) {
        correctCount += 1;
        if (fast) speedBonus += 1;
        api.sfx('good');
      } else {
        api.sfx('bad');
      }

      /* lock chips and paint feedback */
      BITS.forEach(function (b) { chipEls[b].g.classList.add('lock'); });

      if (cur.twoFlip) {
        /* reveal both true flips; mark the syndrome's (wrong) target */
        cur.flips.forEach(function (b) { chipEls[b].g.classList.add('flip'); });
        if (cur.pointed) {
          chipEls[cur.pointed].g.classList.add(correct ? 'good' : 'reveal');
        }
        if (picked && picked !== cur.pointed) chipEls[picked].g.classList.add('bad');

        promptEl.innerHTML = correct
          ? '<b>Decoded as designed — and deceived.</b>'
          : (timedOut ? '<b>Timed out.</b> The decoder still has an answer:'
                      : 'The syndrome pointed elsewhere.');
        footEl.innerHTML =
          'Two bits actually flipped: <b>' + cur.flips[0] + '</b> and <b>' + cur.flips[1] +
          '</b>. The syndrome (their symmetric difference) names <b>' +
          (cur.pointed || '—') + '</b> — one bit, confidently wrong. ' +
          'd<sub>min</sub> = 3 corrects 1 error and <em>miscorrects</em> 2.';
      } else {
        if (correct) {
          chipEls[cur.truth].g.classList.add('good');
          promptEl.innerHTML = 'Correct — only that bit lies in exactly the red circles.';
        } else {
          if (picked) chipEls[picked].g.classList.add('bad');
          chipEls[cur.truth].g.classList.add('reveal');
          promptEl.innerHTML = timedOut
            ? '<b>Timed out.</b> It was <b>' + cur.truth + '</b>.'
            : 'Not quite — the flipped bit was <b>' + cur.truth + '</b>.';
        }
        footEl.innerHTML = readEl.textContent
          ? '' : 'Syndrome: ' + syndromeText(cur);
      }

      log.push({
        n: round,
        kind: cur.twoFlip ? '2-flip' : 'single',
        flips: cur.flips.slice(),
        pointed: cur.pointed,
        truth: cur.truth,
        picked: timedOut ? '—' : picked,
        correct: correct,
        fast: correct && fast,
        timedOut: timedOut
      });

      api.status('Round ' + round + '/' + ROUNDS + ' · ' + correctCount + ' correct');

      /* advance after a short beat */
      advanceId = setTimeout(function () {
        advanceId = null;
        if (round >= ROUNDS) finish();
        else startRound();
      }, cur.twoFlip ? 2600 : 1700);
    }

    /* -------------------- finish -------------------- */
    function starsFor(c) {
      if (c >= 7) return 3;
      if (c >= 5) return 2;
      if (c >= 3) return 1;
      return 0;
    }

    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

    function finish() {
      if (completed) return;
      completed = true;
      clearTimer();

      var sb = Math.min(speedBonus, 5);
      var stars = starsFor(correctCount);
      var bits = clamp(Math.round(50 * (correctCount / ROUNDS) + sb), 0, 50);

      var headline = stars >= 3 ? 'Frames clean — relay holds'
        : stars === 2 ? 'Most frames recovered'
        : stars === 1 ? 'Link patchy but alive'
        : 'Buffer overran with errors';

      api.complete({
        stars: stars,
        bits: bits,
        headline: headline,
        detailHTML: buildDetail(correctCount, sb, bits)
      });
    }

    function buildDetail(correct, sb, bits) {
      var rows = log.map(function (r) {
        var res = r.timedOut ? '⏱ miss'
          : r.correct ? (r.fast ? '✓ fast' : '✓')
          : '✗';
        var flips = r.flips.join(', ');
        var detail = r.kind === '2-flip'
          ? 'flips ' + flips + ' → reads ' + (r.pointed || '—')
          : 'flip ' + flips;
        return '<tr><td>' + r.n + '</td><td>' + r.kind + '</td><td>' + detail +
          '</td><td>' + (r.picked == null ? '—' : r.picked) + '</td><td>' + res + '</td></tr>';
      }).join('');

      return '' +
        '<p>You read <b>' + correct + ' / ' + ROUNDS + '</b> syndromes correctly' +
        (sb > 0 ? ', with a <b>+' + sb + '</b> speed bonus' : '') +
        ' — <b>' + bits + ' bits</b>.</p>' +
        '<table><thead><tr><th>#</th><th>type</th><th>error</th><th>you</th><th></th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table>' +
        '<p>Three parity checks give a <b>3-bit syndrome</b>: 2³ = 8 cases — ' +
        'the 7 single-bit error positions plus "clean". That count fits exactly ' +
        '(n + 1 ≤ 2<sup>r</sup>, here 7 + 1 = 2³), which is <em>why</em> ' +
        'Hamming(7,4) corrects any single error. The two-flip rounds land on a ' +
        'syndrome that already belongs to a single error, so the decoder ' +
        'corrects the wrong bit — that is exactly where distance 3 runs out.</p>';
    }

    /* -------------------- go -------------------- */
    buildSvg();
    startRound();

    /* -------------------- teardown -------------------- */
    return {
      destroy: function () {
        clearTimer();
        if (advanceId !== null) { clearTimeout(advanceId); advanceId = null; }
      }
    };
  }
});

})();
