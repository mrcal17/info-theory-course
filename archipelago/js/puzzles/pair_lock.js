/* THE QUIET ARCHIPELAGO — pair-lock (mutual information dials), PEDAGOGY rework.
   The twin dials of the Mirror Spires. Dial A spins on its own; the player tunes
   dial B to answer it. HOOK (can A ever say nothing?) → GUIDE (read the row you
   live in; config joint, config resonance goal) → INDEPENDENCE (internal I=0
   joint with skewed marginals; the gate is a yes/no question) → MASTERY (config
   joint; within one hit of best possible over the round count) → DEBRIEF
   (I = H(B) − H(B|A) with their numbers). Taught players skip straight to
   mastery. Spins deal from a largest-remainder quantized deck of the joint, so
   correct play passes the gate deterministically and lazy constant-B play
   misses it deterministically (see _smoke/pz_test_pair-lock.mjs).
   Contract: ../../DESIGN.md schema #11 + ../../PEDAGOGY.md §6.11.
   IIFE, no globals; pure helpers exposed on the registered def as _qa. */
(function () {
'use strict';

/* ============================ pure logic ============================ */

function normalizeJoint(joint) {
  var s = 0, i, j;
  for (i = 0; i < joint.length; i++)
    for (j = 0; j < joint[i].length; j++) s += joint[i][j] || 0;
  if (s <= 0) return joint.map(function (r) { return r.map(function () { return 0; }); });
  return joint.map(function (r) { return r.map(function (v) { return (v || 0) / s; }); });
}
function rowMarginals(J) {
  return J.map(function (r) { return r.reduce(function (a, b) { return a + b; }, 0); });
}
function colMarginals(J) {
  var n = J[0].length, c = [], i, j;
  for (j = 0; j < n; j++) c[j] = 0;
  for (i = 0; i < J.length; i++) for (j = 0; j < n; j++) c[j] += J[i][j];
  return c;
}
function conditionalRow(J, a) { // P(B | A=a)
  var row = J[a], s = row.reduce(function (x, y) { return x + y; }, 0);
  if (s <= 0) return row.map(function () { return 0; });
  return row.map(function (v) { return v / s; });
}
function argmax(arr) { var bi = 0, i; for (i = 1; i < arr.length; i++) if (arr[i] > arr[bi]) bi = i; return bi; }

function entropyBits(ps) {
  var H = 0, i;
  for (i = 0; i < ps.length; i++) if (ps[i] > 0) H -= ps[i] * (Math.log(ps[i]) / Math.LN2);
  return H;
}
// H(B|A) = Σ_a P(a)·H(P(B|A=a))
function condEntropyBits(J) {
  var pa = rowMarginals(J), h = 0, a;
  for (a = 0; a < J.length; a++) if (pa[a] > 0) h += pa[a] * entropyBits(conditionalRow(J, a));
  return h;
}
// best-possible hit rate = Σ_a P(a)·max_b P(b|a)
function bestRate(J) {
  var pa = rowMarginals(J), r = 0, a, cond;
  for (a = 0; a < J.length; a++) { cond = conditionalRow(J, a); r += pa[a] * cond[argmax(cond)]; }
  return r;
}
// chance rate = max_b P(b) over the column marginal (best blind guess)
function chanceRate(J) { var c = colMarginals(J); return c[argmax(c)]; }

function mutualInfoBits(J) {
  var pa = rowMarginals(J), pb = colMarginals(J), mi = 0, i, j, p;
  for (i = 0; i < J.length; i++) for (j = 0; j < J[i].length; j++) {
    p = J[i][j];
    if (p <= 0 || pa[i] <= 0 || pb[j] <= 0) continue;
    mi += p * (Math.log(p / (pa[i] * pb[j])) / Math.LN2);
  }
  return mi < 0 ? 0 : mi;
}

// sample an index from a probability vector using r in [0,1)
function sampleIdx(probs, r) {
  var acc = 0, i;
  for (i = 0; i < probs.length; i++) { acc += probs[i]; if (r < acc) return i; }
  return probs.length - 1;
}

/* ---- deck quantization: R cards whose composition matches the joint ----
   Largest-remainder; ties broken by cell probability, then row-major.
   Deterministic, so the gate is a skill check, not a luck check. */
function quantizeDeck(J, R) {
  var n = J.length, m = J[0].length, cells = [], a, b, x;
  for (a = 0; a < n; a++) for (b = 0; b < m; b++) {
    x = J[a][b] * R;
    cells.push({ a: a, b: b, p: J[a][b], fl: Math.floor(x), rem: x - Math.floor(x) });
  }
  var total = cells.reduce(function (s, c) { return s + c.fl; }, 0);
  var order = cells.slice().sort(function (x, y) {
    return (y.rem - x.rem) || (y.p - x.p) || ((x.a * m + x.b) - (y.a * m + y.b));
  });
  for (var k = 0; total < R && k < order.length; k++) { order[k].fl++; total++; }
  var counts = [];
  for (a = 0; a < n; a++) { counts.push([]); for (b = 0; b < m; b++) counts[a].push(0); }
  cells.forEach(function (c) { counts[c.a][c.b] = c.fl; });
  return counts;
}
function deckCards(counts) {
  var cards = [], a, b, k;
  for (a = 0; a < counts.length; a++) for (b = 0; b < counts[a].length; b++)
    for (k = 0; k < counts[a][b]; k++) cards.push({ a: a, b: b });
  return cards;
}
// what each strategy scores on a given deck (reading rows from the DISPLAYED joint)
function deckStats(J, counts) {
  var n = counts.length, m = counts[0].length, a, b;
  var am = 0, constHits = [];
  for (b = 0; b < m; b++) constHits.push(0);
  for (a = 0; a < n; a++) {
    var ra = argmax(conditionalRow(J, a));
    for (b = 0; b < m; b++) {
      if (b === ra) am += counts[a][b];
      constHits[b] += counts[a][b];
    }
  }
  var mc = 0;
  for (b = 0; b < m; b++) if (constHits[b] > mc) mc = constHits[b];
  return { argmaxHits: am, constHits: constHits, maxConst: mc };
}
// mastery gate: within one hit of the best-possible expected hits
function masteryGate(J, R) {
  return Math.max(1, Math.floor(R * bestRate(J)) - 1);
}
/* choose the mastery round count: smallest R ≥ baseRounds whose deck gives
   (a) row-argmax play ≥ gate + 2 (one slip allowed beyond the formula slack),
   (b) every constant-B strategy ≤ gate − 2 (kill-switch margin),
   (c) deck argmax hits within 1 of R·bestRate (honest "best possible" readout).
   Falls back to the widest kill-switch margin found if no R qualifies. */
function masteryPlan(J, baseRounds) {
  var fallback = null, R, last;
  for (R = baseRounds; R <= baseRounds + 16; R++) {
    var counts = quantizeDeck(J, R);
    var st = deckStats(J, counts);
    var g = masteryGate(J, R);
    var honest = Math.abs(st.argmaxHits - R * bestRate(J)) <= 1;
    var item = { rounds: R, gate: g, counts: counts, argmaxHits: st.argmaxHits,
      maxConst: st.maxConst, widened: R > baseRounds };
    if (st.argmaxHits - g >= 2 && g - st.maxConst >= 2 && honest) return item;
    if (st.argmaxHits >= g &&
        (!fallback || (g - st.maxConst) > (fallback.gate - fallback.maxConst))) fallback = item;
    last = item;
  }
  return fallback || last;
}
/* the independence round's internal joint: I(X;Y)=0, marginals NOT flat.
   rows are all the same (skewed) B-marginal, so the grid still looks structured. */
function indepJoint(n) {
  var base = [5, 3, 2, 1, 1, 1].slice(0, n);
  var wA = base.slice(), wB = base.slice(), i, j;
  if (n >= 2) { wB[0] = wA[1]; wB[1] = wA[0]; } // commonest B sits at index 1
  var sA = 0, sB = 0;
  for (i = 0; i < n; i++) { sA += wA[i]; sB += wB[i]; }
  var J = [];
  for (i = 0; i < n; i++) {
    J.push([]);
    for (j = 0; j < n; j++) J[i].push((wA[i] / sA) * (wB[j] / sB));
  }
  return J;
}

/* ============================ style ============================ */

var STYLE_ID = 'pl-style';
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  var s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = [
    '.pl-wrap{display:flex;flex-direction:column;gap:0.8rem;}',
    '.pl-flavor{color:var(--muted);font-size:0.86rem;line-height:1.5;font-style:italic;}',
    '.pl-flavor b{color:var(--purple);font-style:normal;}',
    '.pl-grid-card{display:flex;flex-direction:column;gap:0.55rem;align-items:center;}',
    '.pl-gridlabel{font-size:0.72rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--dim);align-self:flex-start;}',
    '.pl-heat{display:grid;gap:3px;}',
    '.pl-hcell{display:flex;align-items:center;justify-content:center;min-width:40px;min-height:40px;',
      'border-radius:7px;font-size:0.72rem;color:#0b1020;font-variant-numeric:tabular-nums;',
      'border:1px solid transparent;transition:box-shadow 0.15s,border-color 0.15s,opacity 0.25s;}',
    '.pl-hcell.pl-corner{background:transparent;color:var(--purple);font-weight:600;}',
    '.pl-hcell.pl-hdr{background:var(--surface2);color:var(--text);font-weight:600;font-size:1.1rem;}',
    '.pl-hcell.pl-arow{box-shadow:0 0 0 2px var(--purple);}',
    '.pl-hcell.pl-dimmed{opacity:0.13;}',
    '.pl-hcell.pl-hdr.pl-dimmed{opacity:0.3;}',
    '.pl-dialrow{display:flex;gap:0.7rem;align-items:center;justify-content:center;flex-wrap:wrap;}',
    '.pl-dialA{display:flex;flex-direction:column;align-items:center;gap:0.2rem;}',
    '.pl-dface{width:84px;height:84px;border-radius:50%;display:flex;align-items:center;justify-content:center;',
      'font-size:2.4rem;border:3px solid var(--surface2);background:radial-gradient(circle at 35% 30%,#2a2150,#15102e);',
      'box-shadow:0 0 18px rgba(167,139,250,0.25);transition:transform 0.5s,box-shadow 0.3s;}',
    '.pl-dface.pl-spin{animation:pl-spin 0.5s ease-out;}',
    '.pl-dface.pl-truth{box-shadow:0 0 22px var(--purple);border-color:var(--purple);}',
    '@keyframes pl-spin{0%{transform:rotate(-220deg) scale(0.92);}100%{transform:none;}}',
    '.pl-caption{font-size:0.72rem;color:var(--dim);letter-spacing:0.08em;text-transform:uppercase;}',
    '.pl-bbtns{display:flex;gap:0.45rem;flex-wrap:wrap;justify-content:center;}',
    '.pl-bbtn{min-width:48px;min-height:48px;font-size:1.5rem;border-radius:10px;border:2px solid var(--surface2);',
      'background:var(--surface);color:var(--text);cursor:pointer;transition:all 0.12s;}',
    '.pl-bbtn:hover:not(:disabled){border-color:var(--purple);color:var(--purple);}',
    '.pl-bbtn.pl-sel{border-color:var(--purple);background:rgba(167,139,250,0.18);color:var(--purple);}',
    '.pl-bbtn:disabled{opacity:0.45;cursor:default;}',
    '.pl-readouts{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:0.5rem;}',
    '.pl-ro{background:var(--surface);border:1px solid var(--surface2);border-radius:10px;padding:0.5rem;text-align:center;}',
    '.pl-ro .pl-rok{font-size:0.68rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--dim);}',
    '.pl-ro .pl-rov{font-size:1.15rem;font-weight:600;font-variant-numeric:tabular-nums;margin-top:0.15rem;}',
    '.pl-ro.pl-you .pl-rov{color:var(--green);}',
    '.pl-ro.pl-best .pl-rov{color:var(--gold);}',
    '.pl-ro.pl-chance .pl-rov{color:var(--muted);}',
    '.pl-ro.pl-need .pl-rov{color:var(--cyan);}',
    '.pl-mi{text-align:center;font-size:0.9rem;line-height:1.5;color:var(--text);}',
    '.pl-mi b{color:var(--cyan);font-variant-numeric:tabular-nums;}',
    '.pl-mi .pl-mizero{color:var(--gold);}',
    '.pl-controls{display:flex;gap:0.6rem;justify-content:center;flex-wrap:wrap;}',
    '.pl-feedback{text-align:center;min-height:1.3rem;font-size:0.95rem;font-weight:600;}',
    '.pl-feedback.pl-good{color:var(--green);}',
    '.pl-feedback.pl-miss{color:var(--muted);}',
    /* hookCard-style question card (own copy: the independence question re-asks
       on a wrong answer, so it must not auto-reveal the correct option) */
    '.pl-q{border:1px solid var(--purple);border-radius:12px;padding:0.8rem 0.9rem;',
      'background:rgba(167,139,250,0.07);display:flex;flex-direction:column;gap:0.6rem;}',
    '.pl-qq{font-size:0.95rem;line-height:1.5;color:var(--text);font-weight:600;}',
    '.pl-qopts{display:flex;gap:0.5rem;flex-wrap:wrap;}',
    '.pl-qopt{flex:1 1 140px;min-height:44px;border:2px solid var(--surface2);border-radius:10px;',
      'background:var(--surface);color:var(--text);font-size:0.9rem;cursor:pointer;padding:0.4rem 0.6rem;',
      'transition:border-color .15s,background .15s;}',
    '.pl-qopt:hover:not(:disabled){border-color:var(--purple);}',
    '.pl-qopt:disabled{cursor:default;opacity:0.55;}',
    '.pl-qopt.pl-right{border-color:var(--green);color:var(--green);opacity:1;background:rgba(52,211,153,0.1);}',
    '.pl-qopt.pl-wrong{border-color:var(--red);color:var(--red);opacity:1;background:rgba(248,113,113,0.08);}',
    '.pl-qrev{font-size:0.88rem;line-height:1.55;color:var(--muted);}',
    '.pl-qrev b{color:var(--text);}',
    '.pl-q .btn{align-self:flex-start;min-height:44px;}',
    /* you-vs-best-vs-blind comparison bars */
    '.pl-cmp{display:flex;flex-direction:column;gap:0.45rem;width:100%;}',
    '.pl-cline{display:grid;grid-template-columns:88px 1fr 84px;gap:0.5rem;align-items:center;',
      'font-size:0.78rem;color:var(--muted);}',
    '.pl-cline .pl-cval{text-align:right;font-variant-numeric:tabular-nums;color:var(--text);}',
    '.pl-cbar{display:block;height:12px;border-radius:6px;background:var(--surface2);overflow:hidden;}',
    '.pl-cfill{display:block;height:100%;border-radius:6px;}',
  ].join('');
  document.head.appendChild(s);
}

// heat color: pale lavender -> bright purple by probability share
function heatColor(p, maxp) {
  var t = maxp > 0 ? p / maxp : 0;
  var r = Math.round(0xc4 + (0x8b - 0xc4) * t);
  var g = Math.round(0xc0 + (0x5c - 0xc0) * t);
  var b = Math.round(0xf4 + (0xf4 - 0xf4) * t);
  var base = 0.35 + 0.65 * t;
  r = Math.round(0x6c + (r - 0x6c) * base);
  g = Math.round(0x54 + (g - 0x54) * base);
  b = Math.round(0x9a + (b - 0x9a) * base);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

/* ============================ mechanic ============================ */

G.puzzles.register('pair-lock', {
  title: 'The Twin Dials',

  /* pure helpers for the scratch logic test (_smoke/pz_test_pair-lock.mjs) */
  _qa: {
    normalizeJoint: normalizeJoint, rowMarginals: rowMarginals, colMarginals: colMarginals,
    conditionalRow: conditionalRow, argmax: argmax, entropyBits: entropyBits,
    condEntropyBits: condEntropyBits, bestRate: bestRate, chanceRate: chanceRate,
    mutualInfoBits: mutualInfoBits, sampleIdx: sampleIdx, quantizeDeck: quantizeDeck,
    deckCards: deckCards, deckStats: deckStats, masteryGate: masteryGate,
    masteryPlan: masteryPlan, indepJoint: indepJoint,
  },

  create: function (root, config, api) {
    ensureStyle();

    /* ---- config + derived quantities ---- */
    var rawJoint = (config.joint && config.joint.length) ? config.joint : [[0.4, 0.1], [0.1, 0.4]];
    var J = normalizeJoint(rawJoint);
    var n = J[0].length;
    var labels = (config.labels && config.labels.length >= n)
      ? config.labels.slice(0, n)
      : ['☾', '☀', '★', '✦', '✧', '◈'].slice(0, n);
    var cfgRounds = config.rounds || 8;
    var cfgGoal = config.goal || 5;

    var pa = rowMarginals(J);
    var pb = colMarginals(J);
    var best = bestRate(J);
    var chance = chanceRate(J);
    var mi = mutualInfoBits(J);
    var hB = entropyBits(pb);
    var hBgA = condEntropyBits(J);

    var J0 = indepJoint(n);              // the stranger towers (I = 0)
    var pa0 = rowMarginals(J0);
    var pb0 = colMarginals(J0);
    var blind0 = argmax(pb0);            // commonest B of the stranger towers

    var plan = masteryPlan(J, cfgRounds);
    var taught = G.pz.taught('pair-lock');

    /* ---- hint ladder (§1.7) ---- */
    var rowReading = [];
    for (var ri = 0; ri < J.length; ri++)
      rowReading.push(labels[ri] + '→' + labels[argmax(conditionalRow(J, ri))]);
    var ladder = G.pz.hintLadder([
      'The row is the only truth. When A lands, nothing outside that row can happen.',
      'Best play: the likeliest cell <b>in the row you are in</b> — not the brightest cell in the grid.',
      'Read it aloud for every spin: ' + rowReading.join(' · ') + '. That table is the whole lock.',
    ]);

    /* ---- state ---- */
    var phase = taught ? 'mastery' : 'hook'; // hook|guide|indep|mastery|done
    var sub = 'idle';                        // idle|guess|reveal|ask
    var deck = [], deckPos = 0;
    var hits = 0, spins = 0;
    var roundRounds = cfgRounds, roundGoal = cfgGoal;
    var curA = -1, curTruth = -1;
    var indepNeed = 4, guideCoached = false;
    var completed = false;
    var timers = [];

    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function shuffle(arr) {
      var a = arr.slice(), i, j, t;
      for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(api.rng() * (i + 1));
        t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }
    function pct(x) { return Math.round(x * 100) + '%'; }

    /* ---- DOM scaffold ---- */
    root.innerHTML =
      '<div class="pl-wrap">' +
        '<div id="pl-banner"></div>' +
        '<div id="pl-coach" style="display:flex;flex-direction:column;gap:0.5rem;"></div>' +
        '<div id="pl-gate"></div>' +
        '<div id="pl-play" style="display:none;flex-direction:column;gap:0.8rem;">' +
          '<div class="g-card pl-grid-card">' +
            '<div class="pl-gridlabel" id="pl-gridlabel">how the towers move together — P(A,B), %</div>' +
            '<div class="pl-heat"></div>' +
          '</div>' +
          '<div class="pl-mi" id="pl-mi"></div>' +
          '<div class="pl-dialrow">' +
            '<div class="pl-dialA"><div class="pl-dface" id="pl-A">·</div><div class="pl-caption">tower A</div></div>' +
            '<div class="pl-dialA"><div class="pl-dface" id="pl-B">·</div><div class="pl-caption">tower B (you)</div></div>' +
          '</div>' +
          '<div class="pl-bbtns" id="pl-bbtns"></div>' +
          '<div class="pl-feedback" id="pl-fb">&nbsp;</div>' +
          '<div class="pl-readouts" id="pl-ros"></div>' +
          '<div class="pl-controls"><button class="btn btn-primary" id="pl-spin" type="button">Spin tower A</button></div>' +
        '</div>' +
        '<div id="pl-end"></div>' +
      '</div>';

    var bannerEl = root.querySelector('#pl-banner');
    var coachEl = root.querySelector('#pl-coach');
    var gateEl = root.querySelector('#pl-gate');
    var playEl = root.querySelector('#pl-play');
    var heatEl = root.querySelector('.pl-heat');
    var miEl = root.querySelector('#pl-mi');
    var aFace = root.querySelector('#pl-A');
    var bFace = root.querySelector('#pl-B');
    var bbtns = root.querySelector('#pl-bbtns');
    var fbEl = root.querySelector('#pl-fb');
    var rosEl = root.querySelector('#pl-ros');
    var spinBtn = root.querySelector('#pl-spin');
    var endEl = root.querySelector('#pl-end');

    function setBanner(num, total, label) {
      bannerEl.innerHTML = '';
      bannerEl.appendChild(G.pz.roundBanner(num, total, label));
    }
    function coach(html) { // max 2 visible coach cards (§1.6)
      coachEl.appendChild(G.pz.coachCard('warden', html));
      while (coachEl.children.length > 2) coachEl.removeChild(coachEl.firstChild);
    }
    function clearCoach() { coachEl.innerHTML = ''; }

    /* ---- heat grid (rebuilt per phase joint) ---- */
    var cellRefs = [], hdrRefs = [];
    function buildGrid(Jx) {
      heatEl.innerHTML = '';
      cellRefs = []; hdrRefs = [];
      var maxp = 0, i, j;
      for (i = 0; i < Jx.length; i++) for (j = 0; j < n; j++) if (Jx[i][j] > maxp) maxp = Jx[i][j];
      heatEl.style.gridTemplateColumns = 'auto repeat(' + n + ', 1fr)';
      var corner = document.createElement('div');
      corner.className = 'pl-hcell pl-corner';
      corner.textContent = 'A\\B';
      heatEl.appendChild(corner);
      for (j = 0; j < n; j++) {
        var hd = document.createElement('div');
        hd.className = 'pl-hcell pl-hdr';
        hd.textContent = labels[j];
        heatEl.appendChild(hd);
      }
      for (i = 0; i < Jx.length; i++) {
        var rowHdr = document.createElement('div');
        rowHdr.className = 'pl-hcell pl-hdr';
        rowHdr.textContent = labels[i] || ('a' + i);
        heatEl.appendChild(rowHdr);
        hdrRefs.push(rowHdr);
        var rr = [];
        for (j = 0; j < n; j++) {
          var c = document.createElement('div');
          c.className = 'pl-hcell';
          c.style.background = heatColor(Jx[i][j], maxp);
          c.textContent = (Jx[i][j] * 100).toFixed(0);
          heatEl.appendChild(c);
          rr.push(c);
        }
        cellRefs.push(rr);
      }
    }
    // "ignore the rest of the grid; you live in one row now" — hard dim
    function highlightRow(a) {
      var x, y;
      for (x = 0; x < cellRefs.length; x++) {
        hdrRefs[x].classList.toggle('pl-dimmed', x !== a);
        for (y = 0; y < n; y++) {
          cellRefs[x][y].classList.toggle('pl-arow', x === a);
          cellRefs[x][y].classList.toggle('pl-dimmed', x !== a);
        }
      }
    }
    function clearRowHighlight() {
      cellRefs.forEach(function (r, x) {
        hdrRefs[x].classList.remove('pl-dimmed');
        r.forEach(function (c) { c.classList.remove('pl-arow', 'pl-dimmed'); });
      });
    }

    /* ---- B buttons ---- */
    var btnRefs = [];
    for (var bj = 0; bj < n; bj++) {
      (function (idx) {
        var b = document.createElement('button');
        b.className = 'pl-bbtn';
        b.type = 'button';
        b.textContent = labels[idx];
        b.disabled = true;
        b.addEventListener('click', function () { chooseB(idx); });
        bbtns.appendChild(b);
        btnRefs.push(b);
      })(bj);
    }
    function setBtnsEnabled(on) { btnRefs.forEach(function (b) { b.disabled = !on; }); }

    /* ---- readouts ---- */
    function renderReadouts(list) {
      rosEl.innerHTML = '';
      list.forEach(function (it) {
        var d = document.createElement('div');
        d.className = 'pl-ro ' + it.cls;
        d.innerHTML = '<div class="pl-rok">' + it.k + '</div><div class="pl-rov" id="' + (it.id || '') + '">' + it.v + '</div>';
        rosEl.appendChild(d);
      });
    }
    function youText() { return spins > 0 ? hits + '/' + spins + ' (' + pct(hits / spins) + ')' : '—'; }
    function refreshYou() {
      var el = rosEl.querySelector('#pl-you');
      if (el) el.textContent = youText();
    }

    function pushStatus() {
      var tag = { hook: 'a question first', guide: 'round 1 · tuned towers',
        indep: 'round 2 · stranger towers', mastery: (taught ? 'mastery' : 'round 3') + ' · the lock',
        done: 'open' }[phase];
      var sp = Math.min(spins + (sub === 'guess' ? 1 : 0), roundRounds);
      var ctr = '';
      if (phase === 'guide') ctr = ' · spin ' + sp + '/' + roundRounds + ' · ✦ ' + hits + '/' + roundGoal;
      else if (phase === 'indep') ctr = ' · spin ' + spins + (sub === 'ask' ? ' · the question' : '');
      else if (phase === 'mastery') ctr = ' · spin ' + sp + '/' + roundRounds + ' · ✦ ' + hits + '/' + roundGoal;
      api.status(tag + ctr);
    }

    /* ============================ phases ============================ */

    function startHook() {
      phase = 'hook';
      playEl.style.display = 'none';
      gateEl.innerHTML = '';
      gateEl.appendChild(G.pz.hookCard({
        question: 'Tower A turns. Can watching it EVER tell you nothing about tower B?',
        options: [
          { label: 'Yes', note: 'some towers say nothing' },
          { label: 'No', note: 'watching always helps' },
        ],
        correct: 0,
        reveal: 'Only if the towers are <b>independent</b> — and you are about to meet exactly that. ' +
          'First: two towers that <b>do</b> talk.',
        doneLabel: 'Let’s find out',
        onDone: function () { gateEl.innerHTML = ''; startGuide(); },
      }));
      pushStatus();
    }

    function startGuide() {
      phase = 'guide'; sub = 'idle';
      roundRounds = cfgRounds; roundGoal = cfgGoal;
      hits = 0; spins = 0; deckPos = 0;
      deck = shuffle(deckCards(quantizeDeck(J, roundRounds)));
      setBanner(1, 3, 'the tuned towers — read the row');
      buildGrid(J);
      miEl.innerHTML = 'the towers share I(X;Y) = <b>' + mi.toFixed(2) + ' bits</b><br>' +
        '<span style="color:var(--muted);font-size:0.82rem">that’s WHY seeing A tells you about B</span>';
      renderReadouts([
        { k: 'your hits', v: '—', cls: 'pl-you', id: 'pl-you' },
        { k: 'best possible', v: pct(best), cls: 'pl-best' },
        { k: 'blind chance', v: pct(chance), cls: 'pl-chance' },
      ]);
      playEl.style.display = 'flex';
      spinBtn.disabled = false;
      resetDials('Ring ' + roundGoal + ' resonances in ' + roundRounds + ' spins. Spin tower A.');
      pushStatus();
    }

    function startIndep() {
      phase = 'indep'; sub = 'idle';
      hits = 0; spins = 0; indepNeed = 4;
      setBanner(2, 3, 'the stranger towers — something is off');
      buildGrid(J0);
      miEl.innerHTML = 'I(X;Y) = <b>?.??</b> bits — how much does A pay here?<br>' +
        '<span style="color:var(--muted);font-size:0.82rem">watch the rows before you trust the glow</span>';
      renderReadouts([
        { k: 'your hits', v: '—', cls: 'pl-you', id: 'pl-you' },
        { k: 'commonest B', v: labels[blind0] + ' (' + pct(pb0[blind0]) + ')', cls: 'pl-chance' },
      ]);
      clearCoach();
      coach('New towers. Strangers, these. The grid still glows — but spin a few times and <b>watch the rows</b>.');
      spinBtn.disabled = false;
      resetDials('Spin tower A a few times. Then I will ask you something.');
      pushStatus();
    }

    function askIndep() {
      sub = 'ask';
      spinBtn.disabled = true;
      setBtnsEnabled(false);
      clearRowHighlight(); // the question is about ALL rows — undim them
      gateEl.innerHTML = '';
      var card = document.createElement('div');
      card.className = 'pl-q';
      card.innerHTML = '<div class="pl-qq">' + spins + ' spins in. Can ANY strategy here beat ' +
        'always guessing the commonest B — ' + labels[blind0] + '?</div>';
      var opts = document.createElement('div');
      opts.className = 'pl-qopts';
      var yesB = document.createElement('button');
      yesB.className = 'pl-qopt'; yesB.type = 'button';
      yesB.textContent = 'Yes — some row must beat ' + labels[blind0];
      var noB = document.createElement('button');
      noB.className = 'pl-qopt'; noB.type = 'button';
      noB.textContent = 'No — nothing beats always-' + labels[blind0];
      opts.appendChild(yesB); opts.appendChild(noB);
      card.appendChild(opts);
      gateEl.appendChild(card);

      yesB.addEventListener('click', function () {
        if (sub !== 'ask') return;
        yesB.classList.add('pl-wrong');
        yesB.disabled = true; noB.disabled = true;
        api.sfx('bump');
        var rev = document.createElement('div');
        rev.className = 'pl-qrev';
        rev.innerHTML = 'The Warden tilts his head. <b>Look at the rows, not the cells.</b> ' +
          labels[0] + '’s row, ' + labels[1] + '’s row — the same shape, only brighter or dimmer. ' +
          'Spin twice more and compare them.';
        card.appendChild(rev);
        var go = document.createElement('button');
        go.className = 'btn'; go.type = 'button';
        go.textContent = 'Spin again';
        go.addEventListener('click', function () {
          gateEl.innerHTML = '';
          indepNeed = spins + 2;
          sub = 'idle';
          spinBtn.disabled = false;
          fbEl.textContent = 'Two more spins. Watch the SHAPE of each row.';
          fbEl.className = 'pl-feedback';
          pushStatus();
        });
        card.appendChild(go);
      });

      noB.addEventListener('click', function () {
        if (sub !== 'ask') return;
        sub = 'answered';
        noB.classList.add('pl-right');
        yesB.disabled = true; noB.disabled = true;
        api.sfx('spark');
        miEl.innerHTML = 'I(X;Y) = <b class="pl-mizero">0.00 bits</b><br>' +
          '<span style="color:var(--muted);font-size:0.82rem">the rows are all the SAME row — that sameness is zero mutual information</span>';
        var rev = document.createElement('div');
        rev.className = 'pl-qrev';
        rev.innerHTML = 'Right. Every row is the same row: P(B|A=a) = P(B) for every a. ' +
          'Knowing A changes <b>nothing</b>, so always-' + labels[blind0] + ' is already perfect — ' +
          'and dull. <b>I(X;Y) = 0.00 bits.</b>';
        card.appendChild(rev);
        var go = document.createElement('button');
        go.className = 'btn btn-primary'; go.type = 'button';
        go.textContent = 'Back to the real lock';
        go.addEventListener('click', function () { gateEl.innerHTML = ''; startMastery(); });
        card.appendChild(go);
      });
      pushStatus();
    }

    function startMastery() {
      phase = 'mastery'; sub = 'idle';
      roundRounds = plan.rounds; roundGoal = plan.gate;
      hits = 0; spins = 0; deckPos = 0;
      deck = shuffle(deckCards(plan.counts));
      if (taught) setBanner(1, 1, 'mastery — the lock remembers you');
      else setBanner(3, 3, 'the lock — spend every row');
      clearCoach(); // round 2's stranger-towers card is stale here
      buildGrid(J);
      miEl.innerHTML = 'these towers share I(X;Y) = <b>' + mi.toFixed(2) + ' bits</b> — spend every one of them';
      // STRIP: best/blind conclusions hidden; the raw grid stays (it is the tool)
      renderReadouts([
        { k: 'your hits', v: '—', cls: 'pl-you', id: 'pl-you' },
        { k: 'lock needs', v: roundGoal + '/' + roundRounds, cls: 'pl-need' },
      ]);
      playEl.style.display = 'flex';
      if (!taught) coach('The lock counts over all ' + roundRounds + ' spins. <b>Every row is a different promise</b> — miss one row’s best answer twice and the gate stays shut.');
      spinBtn.disabled = false;
      resetDials('Ring ' + roundGoal + ' of ' + roundRounds + '. The lock tallies at the end.');
      pushStatus();
    }

    /* ============================ play loop ============================ */

    function resetDials(msg) {
      aFace.textContent = '·'; bFace.textContent = '·';
      aFace.classList.remove('pl-truth'); bFace.classList.remove('pl-truth');
      clearRowHighlight();
      setBtnsEnabled(false);
      btnRefs.forEach(function (b) { b.classList.remove('pl-sel'); });
      fbEl.textContent = msg;
      fbEl.className = 'pl-feedback';
      refreshYou();
    }

    function spinA() {
      if (sub !== 'idle') return;
      if (phase !== 'guide' && phase !== 'indep' && phase !== 'mastery') return;
      sub = 'guess';
      if (phase === 'indep') {
        curA = sampleIdx(pa0, api.rng());
        curTruth = sampleIdx(pb0, api.rng()); // independent of A by construction
      } else {
        var card = deck[deckPos]; deckPos++;
        curA = card.a; curTruth = card.b;
      }
      aFace.classList.remove('pl-truth');
      bFace.classList.remove('pl-truth');
      bFace.textContent = '·';
      aFace.classList.remove('pl-spin'); void aFace.offsetWidth; aFace.classList.add('pl-spin');
      aFace.textContent = labels[curA];
      highlightRow(curA);
      setBtnsEnabled(true);
      btnRefs.forEach(function (b) { b.classList.remove('pl-sel'); });
      spinBtn.disabled = true;
      fbEl.textContent = 'Tower A landed on ' + labels[curA] + '. Now tune tower B.';
      fbEl.className = 'pl-feedback';
      api.sfx('select');
      if (phase === 'guide' && !guideCoached) {
        guideCoached = true;
        coach('Ignore the rest of the grid. <b>You live in one row now</b> — ' + labels[curA] + '’s row. The rest cannot happen this spin.');
      }
      pushStatus();
    }

    function chooseB(b) {
      if (sub !== 'guess') return;
      sub = 'reveal';
      setBtnsEnabled(false);
      btnRefs.forEach(function (x, k) { x.classList.toggle('pl-sel', k === b); });
      bFace.textContent = labels[b];

      later(function () {
        bFace.textContent = labels[curTruth];
        bFace.classList.add('pl-truth');
        var match = (curTruth === b);
        spins++;
        if (match) {
          hits++;
          fbEl.textContent = '✦ Chime! Both towers rang ' + labels[curTruth] + '. +1 resonance.';
          fbEl.className = 'pl-feedback pl-good';
          api.sfx('spark');
        } else {
          fbEl.textContent = 'Tower B settled on ' + labels[curTruth] + '. No chime.';
          fbEl.className = 'pl-feedback pl-miss';
          api.sfx('bump');
        }
        refreshYou();
        pushStatus();
        later(advance, 420);
      }, 480);
    }

    function advance() {
      if (phase === 'guide') {
        if (hits >= roundGoal) { guideWin(); return; }
        if (spins >= roundRounds) { roundFail('guide'); return; }
      } else if (phase === 'indep') {
        if (spins >= indepNeed) { askIndep(); return; }
      } else if (phase === 'mastery') {
        if (spins >= roundRounds) { masteryEnd(); return; }
      }
      sub = 'idle';
      spinBtn.disabled = false;
      pushStatus();
    }

    function guideWin() {
      sub = 'between';
      ladder.reset();
      spinBtn.disabled = true;
      fbEl.textContent = '✦ ' + hits + ' resonances — the east tower hums along.';
      fbEl.className = 'pl-feedback pl-good';
      coach('You stopped reading the grid and started reading the <b>row</b>. Keep that. Now — a stranger pair.');
      later(startIndep, 1400);
    }

    function roundFail(which) {
      sub = 'between';
      var msg = which === 'guide'
        ? 'Only ' + hits + ' of ' + roundGoal + ' resonances. The dials reshuffle — listen again.'
        : 'The lock counted ' + hits + ' — it needs ' + roundGoal + '. The deck reshuffles.';
      api.fail(msg);
      var hint = ladder.fail();
      if (hint) coach(hint);
      // cheap reset, fresh shuffle, same round (earlier rounds keep their progress)
      hits = 0; spins = 0; deckPos = 0;
      deck = shuffle(deckCards(which === 'guide' ? quantizeDeck(J, roundRounds) : plan.counts));
      later(function () {
        sub = 'idle';
        spinBtn.disabled = false;
        resetDials('Fresh shuffle. Spin tower A.');
        pushStatus();
      }, 700);
    }

    function masteryEnd() {
      if (hits >= roundGoal) { showDebrief(); return; }
      roundFail('mastery');
    }

    /* ============================ debrief ============================ */

    function cmpLine(label, frac, color) {
      return '<div class="pl-cline"><span>' + label + '</span>' +
        '<span class="pl-cbar"><span class="pl-cfill" style="width:' + Math.round(frac * 100) +
        '%;background:' + color + '"></span></span>' +
        '<span class="pl-cval">' + pct(frac) + '</span></div>';
    }

    function showDebrief() {
      phase = 'done'; sub = 'done';
      spinBtn.disabled = true;
      spinBtn.parentElement.style.display = 'none';
      setBtnsEnabled(false);
      ladder.reset();
      var youRate = spins > 0 ? hits / spins : 0;
      var cmp = '<div class="pl-cmp">' +
        cmpLine('you', youRate, 'var(--green)') +
        cmpLine('best possible', best, 'var(--gold)') +
        cmpLine('blind (' + labels[argmax(pb)] + ')', chance, 'var(--muted)') +
        '</div>';
      var eq = 'Tower B alone is worth H(B) = <span class="pzk-eq">' + hB.toFixed(2) + ' bits</span> of surprise. ' +
        'Watching tower A leaves only H(B|A) = <span class="pzk-eq">' + hBgA.toFixed(2) + ' bits</span>.<br>' +
        '<b>I(X;Y) = H(B) − H(B|A) = ' + hB.toFixed(2) + ' − ' + hBgA.toFixed(2) + ' = ' + mi.toFixed(2) + ' bits</b> — ' +
        'I is how many bits of B’s entropy tower A pays for. You cashed them in: ' +
        hits + ' of ' + spins + ' spins rang true, against ' + pct(chance) + ' blind.';
      endEl.innerHTML = '';
      endEl.appendChild(G.pz.debriefCard({
        title: 'The towers lock in unison',
        html: cmp + '<div style="margin-top:0.6rem">' + eq + '</div>',
        buttonLabel: 'Open the lock',
        tone: 'win',
        onButton: function () {
          if (completed) return;
          completed = true;
          G.pz.markTaught('pair-lock');
          api.complete();
        },
      }));
      endEl.scrollIntoView ? endEl.scrollIntoView({ block: 'nearest' }) : 0;
      api.sfx('solve');
      pushStatus();
    }

    /* ============================ boot ============================ */

    spinBtn.addEventListener('click', spinA);

    if (taught) {
      startMastery();
    } else {
      startHook();
    }

    return {
      destroy: function () {
        clearTimers();
        spinBtn.removeEventListener('click', spinA);
        root.innerHTML = '';
      },
    };
  },
});

})();
