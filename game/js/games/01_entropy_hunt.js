/* SIGNAL LOST — 01 · Twenty Bits (entropy-hunt)
   Entropy as the floor on optimal yes/no questioning. Contract: ../DESIGN.md. */
(function () {
'use strict';

/* ---------------- pure math (no DOM, unit-testable) ---------------- */

function log2(x) { return Math.log(x) / Math.LN2; }

// Binary entropy H2(q) = -q log2 q - (1-q) log2(1-q), in bits. Endpoints -> 0.
function h2(q) {
  if (q <= 0 || q >= 1) return 0;
  return -q * log2(q) - (1 - q) * log2(1 - q);
}

// Shannon entropy of a list of nonnegative weights, normalized internally.
function entropy(weights) {
  var sum = 0, i;
  for (i = 0; i < weights.length; i++) sum += weights[i];
  if (sum <= 0) return 0;
  var h = 0;
  for (i = 0; i < weights.length; i++) {
    var p = weights[i] / sum;
    if (p > 0) h -= p * log2(p);
  }
  return h;
}

function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

// Linear interpolation between two hex-ish CSS colors via channel mix.
function mixColor(t) {
  // t in [0,1]: 0 -> dim grey, 1 -> green. Used to color the H2(q) readout.
  t = clamp(t, 0, 1);
  var dim = [100, 116, 139];   // --dim  #64748b
  var grn = [52, 211, 153];    // --green #34d399
  var r = Math.round(dim[0] + (grn[0] - dim[0]) * t);
  var g = Math.round(dim[1] + (grn[1] - dim[1]) * t);
  var b = Math.round(dim[2] + (grn[2] - dim[2]) * t);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

/* ---------------- round distributions ----------------
   Each round: a pool of glyphs with integer-ish weights. Entropy is computed
   from the ACTUAL normalized weights via entropy(), never hardcoded. */

var GLYPHS = ['🛰️','📡','🔋','⚙️','🧯','🔌','💾','🧲','🛢️','🪫','🔭','🧪','📟','🔦','🛞','🧰'];

function uniformRound(n) {
  var w = [];
  for (var i = 0; i < n; i++) w.push(1);
  return w;
}

// Geometric-ish skew: weight[i] ∝ ratio^i, then scaled to small integers.
function skewRound(n, ratio) {
  var w = [];
  for (var i = 0; i < n; i++) w.push(Math.max(1, Math.round(1000 * Math.pow(ratio, i))));
  return w;
}

// Dyadic weights 1/2, 1/4, ... with the last two equal so they sum to 1.
function dyadicRound(n) {
  var w = [], i;
  for (i = 0; i < n - 1; i++) w.push(Math.pow(2, n - 1 - i)); // 2^(n-1) .. 2^1
  w.push(w[w.length - 1]);                                    // duplicate smallest
  return w; // e.g. n=8 -> 128,64,32,16,8,4,2,2  ∝ 1/2,1/4,...,1/128,1/128
}

function buildRounds(rng) {
  // Deterministic structure, randomized glyph identities per run.
  var specs = [
    { name: 'Uniform array',     n: 16, weights: uniformRound(16),     note: 'Sixteen equal suspects. Binary search is exact.' },
    { name: 'Skewed bus',        n: 12, weights: skewRound(12, 0.70),  note: 'Weights tilt. Split the mass, not the count.' },
    { name: 'One loud fault',    n: 12, weights: skewRound(12, 0.50),  note: 'One node holds half the mass. Isolate it.' },
    { name: 'Dyadic ladder',     n: 8,  weights: dyadicRound(8),       note: 'Powers of two. Perfect questions land on H exactly.' },
  ];
  var pool = GLYPHS.slice();
  // shuffle a copy so each round draws a different-looking set of glyphs
  for (var s = pool.length - 1; s > 0; s--) {
    var j = Math.floor(rng() * (s + 1));
    var tmp = pool[s]; pool[s] = pool[j]; pool[j] = tmp;
  }
  return specs.map(function (spec, ri) {
    var glyphs = [];
    for (var i = 0; i < spec.n; i++) glyphs.push(pool[(ri * 3 + i) % pool.length]);
    return {
      name: spec.name,
      note: spec.note,
      glyphs: glyphs,
      weights: spec.weights.slice(),
      H: entropy(spec.weights),
    };
  });
}

/* ---------------- DOM helper ---------------- */

function mk(tag, cls, html) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

/* ---------------- registration ---------------- */

Game.register({
  id: 'entropy-hunt',
  title: 'Twenty Bits',
  icon: '🔦',
  part: 1,
  module: '1A',
  moduleTitle: 'Entropy',
  moduleUrl: '../1a_entropy/',
  tagline: 'Find the fault with the fewest yes/no questions.',

  briefing:
    '<p>The relay’s diagnostic bus is dark and one component has failed — ' +
    'but the log won’t say which. You can only interrogate the bus: name a set ' +
    'of suspect parts and ask whether the fault is among them. It answers yes or no, ' +
    'and nothing more. Every question costs you. Ask well.</p>' +
    '<ul>' +
    '<li>Click glyphs to add them to your query set; click again to remove.</li>' +
    '<li>Press <b>Ask</b> (or <b>Enter</b>) to query the bus — each answer eliminates either your set or its complement.</li>' +
    '<li>Watch the live readout: a question is worth <b>H₂(q)</b> bits, maxed at 1.00 when your set holds half the probability mass.</li>' +
    '<li>Four rounds, harder distributions each time. Fewer questions = more bits.</li>' +
    '</ul>',

  concept:
    '<p>To pin down a value X drawn from a distribution, the <em>minimum</em> ' +
    'expected number of yes/no questions is its entropy ' +
    '<b>H(X) = −Σ pᵢ log₂ pᵢ</b> bits. No strategy can do better on average.</p>' +
    '<p>Each yes/no answer carries at most <b>1 bit</b> — and exactly 1 bit only when the ' +
    '“yes” set carries half the remaining probability mass (q = ½, so H₂(q) = 1). ' +
    'Splitting by <em>count</em> is a trap under skew: to extract a full bit you must split ' +
    'the <em>mass</em>. Halve the mass every time and your question count converges to H(X).</p>',

  create: function (root, api) {
    // ---- all mutable state lives here; create() is the full reset ----
    var rng = api.rng;
    var rounds = buildRounds(rng);
    var NR = rounds.length;
    var Htot = rounds.reduce(function (a, r) { return a + r.H; }, 0);

    var roundIdx = 0;
    var questionsTotal = 0;
    var perRound = [];          // questions used per finished round
    var alive = [];             // indices of remaining candidates this round
    var selected = {};          // glyph index -> true if in query set
    var weights = [];           // current weights of THIS round (full-length; dead = 0)
    var glyphs = [];
    var revealing = false;      // lock input during reveal animation
    var finished = false;

    var timers = [];
    function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    api.injectStyle(
      '.eh-wrap{display:flex;flex-direction:column;gap:1rem;}' +
      '.eh-head{display:flex;justify-content:space-between;align-items:baseline;gap:0.6rem;flex-wrap:wrap;}' +
      '.eh-rname{font-weight:600;font-size:1rem;}' +
      '.eh-rnum{font-size:0.72rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);}' +
      '.eh-note{font-size:0.82rem;color:var(--muted);line-height:1.5;}' +
      '.eh-readout{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.6rem;}' +
      '.eh-stat{background:var(--bg);border:1px solid var(--surface2);border-radius:10px;padding:0.7rem 0.8rem;}' +
      '.eh-stat .eh-k{font-size:0.68rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--dim);}' +
      '.eh-stat .eh-v{font-size:1.35rem;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.3;}' +
      '.eh-stat .eh-sub{font-size:0.7rem;color:var(--muted);}' +
      '.eh-bar{height:6px;background:var(--surface2);border-radius:4px;overflow:hidden;margin-top:0.4rem;}' +
      '.eh-bar>i{display:block;height:100%;border-radius:4px;transition:width 0.18s;}' +
      '.eh-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:0.55rem;}' +
      '.eh-glyph{position:relative;min-height:72px;min-width:40px;border:2px solid var(--surface2);' +
        'border-radius:12px;background:var(--surface);cursor:pointer;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;gap:0.15rem;padding:0.35rem 0.2rem;' +
        'transition:transform 0.12s,border-color 0.12s,opacity 0.2s;color:var(--text);font-family:inherit;}' +
      '.eh-glyph:hover:not(:disabled){transform:translateY(-2px);border-color:var(--blue);}' +
      '.eh-glyph .eh-em{line-height:1;}' +
      '.eh-glyph .eh-pct{font-size:0.66rem;color:var(--muted);font-variant-numeric:tabular-nums;}' +
      '.eh-glyph.eh-sel{border-color:var(--blue);background:#0c2a3a;box-shadow:0 0 0 1px var(--blue) inset;}' +
      '.eh-glyph.eh-dead{opacity:0.28;filter:grayscale(1);cursor:default;border-style:dashed;}' +
      '.eh-glyph.eh-win{border-color:var(--green);box-shadow:0 0 22px rgba(52,211,153,0.55);' +
        'animation:eh-pulse 0.7s ease-out;}' +
      '@keyframes eh-pulse{0%{transform:scale(1);}40%{transform:scale(1.18);}100%{transform:scale(1.05);}}' +
      '.eh-controls{display:flex;gap:0.7rem;flex-wrap:wrap;align-items:center;}' +
      '.eh-controls .btn{min-height:44px;}' +
      '.eh-msg{font-size:0.85rem;color:var(--muted);min-height:1.2em;flex:1;}' +
      '.eh-msg b.eh-yes{color:var(--green);}' +
      '.eh-msg b.eh-no{color:var(--red);}' +
      '@media (max-width:420px){.eh-glyph .eh-em{font-size:1.4rem;}.eh-grid{grid-template-columns:repeat(auto-fill,minmax(60px,1fr));}}'
    );

    // ---- DOM scaffold ----
    var wrap = mk('div', 'eh-wrap');

    var head = mk('div', 'eh-head');
    var rname = mk('div', 'eh-rname');
    var rnum = mk('div', 'eh-rnum');
    head.appendChild(rname);
    head.appendChild(rnum);
    wrap.appendChild(head);

    var note = mk('div', 'eh-note');
    wrap.appendChild(note);

    // live readout: q, H2(q), uncertainty remaining
    var readout = mk('div', 'eh-readout');
    var stQ = makeStat('selected mass q', 'set holds none yet');
    var stH2 = makeStat('info of this question', '≤ 1 bit per yes/no');
    var stH = makeStat('uncertainty remaining', 'entropy of belief');
    readout.appendChild(stQ.box);
    readout.appendChild(stH2.box);
    readout.appendChild(stH.box);
    wrap.appendChild(readout);

    var grid = mk('div', 'eh-grid');
    wrap.appendChild(grid);

    var controls = mk('div', 'eh-controls');
    var msg = mk('div', 'eh-msg', '');
    var askBtn = mk('button', 'btn btn-primary', 'Ask the bus');
    var clearBtn = mk('button', 'btn btn-ghost', 'Clear set');
    controls.appendChild(askBtn);
    controls.appendChild(clearBtn);
    controls.appendChild(msg);
    wrap.appendChild(controls);

    root.replaceChildren(wrap);

    function makeStat(k, sub) {
      var box = mk('div', 'eh-stat');
      box.appendChild(mk('div', 'eh-k', k));
      var v = mk('div', 'eh-v', '—');
      box.appendChild(v);
      var s = mk('div', 'eh-sub', sub);
      box.appendChild(s);
      var bar = mk('div', 'eh-bar');
      var fill = mk('i');
      fill.style.width = '0%';
      fill.style.background = 'var(--green)';
      bar.appendChild(fill);
      box.appendChild(bar);
      return { box: box, v: v, sub: s, fill: fill };
    }

    // ---- round setup ----
    function loadRound() {
      var r = rounds[roundIdx];
      glyphs = r.glyphs.slice();
      weights = r.weights.slice();
      alive = [];
      for (var i = 0; i < glyphs.length; i++) alive.push(i);
      selected = {};
      revealing = false;

      rname.textContent = r.name;
      rnum.textContent = 'Round ' + (roundIdx + 1) + ' / ' + NR;
      note.textContent = r.note;

      renderGrid();
      updateReadout();
      setMsg('Select a set of suspects, then ask whether the fault is inside it.');
      enableInput(true);
      pushStatus();
    }

    function aliveWeightSum() {
      var s = 0;
      for (var k = 0; k < alive.length; k++) s += weights[alive[k]];
      return s;
    }

    function renderGrid() {
      grid.replaceChildren();
      var total = aliveWeightSum();
      for (var i = 0; i < glyphs.length; i++) {
        (function (idx) {
          var dead = alive.indexOf(idx) < 0;
          var p = dead ? 0 : weights[idx] / total;
          var btn = mk('button', 'eh-glyph' + (dead ? ' eh-dead' : '') + (selected[idx] ? ' eh-sel' : ''));
          var em = mk('span', 'eh-em', glyphs[idx]);
          // subtle size-by-weight: alive glyphs scale 1.2rem..2.1rem with p
          var size = dead ? 1.4 : (1.2 + clamp(p, 0, 1) * 2.2);
          em.style.fontSize = size.toFixed(2) + 'rem';
          btn.appendChild(em);
          btn.appendChild(mk('span', 'eh-pct', dead ? '—' : (p * 100).toFixed(p < 0.1 ? 1 : 0) + '%'));
          btn.disabled = dead;
          btn.setAttribute('aria-pressed', selected[idx] ? 'true' : 'false');
          if (!dead) btn.addEventListener('click', function () { toggle(idx); });
          grid.appendChild(btn);
        })(i);
      }
    }

    function toggle(idx) {
      if (revealing || finished) return;
      if (alive.indexOf(idx) < 0) return;
      selected[idx] = !selected[idx];
      api.sfx('click');
      renderGrid();
      updateReadout();
    }

    function selectedMass() {
      var total = aliveWeightSum();
      if (total <= 0) return 0;
      var s = 0;
      for (var k = 0; k < alive.length; k++) {
        if (selected[alive[k]]) s += weights[alive[k]];
      }
      return s / total;
    }

    function aliveWeights() {
      var out = [];
      for (var k = 0; k < alive.length; k++) out.push(weights[alive[k]]);
      return out;
    }

    function updateReadout() {
      var q = selectedMass();
      var info = h2(q);
      var H = entropy(aliveWeights());

      stQ.v.textContent = (q * 100).toFixed(1) + '%';
      stQ.fill.style.width = (q * 100).toFixed(1) + '%';
      stQ.fill.style.background = 'var(--blue)';
      var anySel = q > 0;
      stQ.sub.textContent = anySel
        ? (Math.abs(q - 0.5) < 0.03 ? 'right on the halfway line' : (q < 0.5 ? 'set is too light' : 'set is too heavy'))
        : 'set holds none yet';

      stH2.v.textContent = info.toFixed(2) + ' bits';
      stH2.v.style.color = mixColor(info);            // green near 1.0, dim toward 0
      stH2.fill.style.width = (info * 100).toFixed(1) + '%';
      stH2.fill.style.background = mixColor(info);
      stH2.sub.textContent = info >= 0.99 ? 'maximal — a clean halving'
        : (info <= 0.001 ? 'this question tells you nothing' : 'H₂(q), at most 1 bit');

      stH.v.textContent = H.toFixed(2) + ' bits';
      // remaining uncertainty fill relative to this round's starting H
      var startH = rounds[roundIdx].H || 1;
      stH.fill.style.width = clamp(H / startH, 0, 1) * 100 + '%';
      stH.fill.style.background = 'var(--purple)';
      stH.sub.textContent = alive.length + ' candidates left';

      // disable Ask when the set is empty or holds everything (a useless question)
      var useless = q <= 0 || q >= 1 || alive.length <= 1;
      askBtn.disabled = useless || revealing || finished;
    }

    function setMsg(html) { msg.innerHTML = html; }

    function enableInput(on) {
      clearBtn.disabled = !on;
      // askBtn handled by updateReadout's useless-check, but force-off when locked
      if (!on) askBtn.disabled = true;
    }

    function ask() {
      if (revealing || finished) return;
      var q = selectedMass();
      if (q <= 0 || q >= 1 || alive.length <= 1) return; // guarded, but be safe

      // The fault is the hidden target. We don't pre-pick it; we sample the
      // answer honestly from the renormalized belief: P(yes) = q. This keeps
      // the game faithful to the distribution and lets lucky runs beat H.
      var yes = rng() < q;

      questionsTotal++;
      var roundQ = (perRound[roundIdx] || 0) + 1;
      perRound[roundIdx] = roundQ;

      // eliminate the side that does NOT contain the fault
      var survivors = [];
      for (var k = 0; k < alive.length; k++) {
        var idx = alive[k];
        var inSet = !!selected[idx];
        if (inSet === yes) survivors.push(idx);
      }
      alive = survivors;
      // clear selection of any glyph that just died
      var newSel = {};
      for (var s2 = 0; s2 < alive.length; s2++) if (selected[alive[s2]]) newSel[alive[s2]] = true;
      selected = newSel;

      api.sfx(yes ? 'good' : 'bad');
      setMsg('Bus answers <b class="' + (yes ? 'eh-yes' : 'eh-no') + '">' + (yes ? 'YES' : 'NO') +
        '</b> — ' + (alive.length) + ' suspect' + (alive.length === 1 ? '' : 's') + ' remain.');

      renderGrid();
      updateReadout();
      pushStatus();

      if (alive.length <= 1) {
        revealWinner();
      }
    }

    function revealWinner() {
      revealing = true;
      enableInput(false);
      askBtn.disabled = true;
      var winnerIdx = alive[0];
      // find the rendered button for the winner and pulse it
      var buttons = grid.querySelectorAll('.eh-glyph');
      // buttons are in glyph-order; winnerIdx maps directly
      if (buttons[winnerIdx]) buttons[winnerIdx].classList.add('eh-win');
      setMsg('Fault isolated: ' + glyphs[winnerIdx] + ' in ' + perRound[roundIdx] +
        ' question' + (perRound[roundIdx] === 1 ? '' : 's') + '.');
      api.sfx('good');

      later(function () {
        roundIdx++;
        if (roundIdx >= NR) {
          finishGame();
        } else {
          loadRound();
        }
      }, 1250);
    }

    function pushStatus() {
      var e = questionsTotal > 0 ? Htot / questionsTotal : 0;
      var eShown = Math.min(1, e);
      api.status('Round ' + Math.min(roundIdx + 1, NR) + '/' + NR +
        ' &middot; ' + questionsTotal + ' question' + (questionsTotal === 1 ? '' : 's') +
        ' &middot; eff ' + (questionsTotal > 0 ? (eShown * 100).toFixed(0) + '%' : '—'));
    }

    function finishGame() {
      if (finished) return;
      finished = true;
      enableInput(false);

      var rawE = Htot / questionsTotal;        // can exceed 1 on lucky runs
      var e = Math.min(1, rawE);
      var stars = e >= 0.85 ? 3 : (e >= 0.65 ? 2 : 1);
      var bits = clamp(Math.round(50 * e), 10, 50);

      var rows = '';
      for (var i = 0; i < NR; i++) {
        var r = rounds[i];
        var used = perRound[i] || 0;
        rows += '<tr><td>' + (i + 1) + '. ' + r.name + '</td>' +
          '<td style="text-align:right;">' + used + '</td>' +
          '<td style="text-align:right;">' + r.H.toFixed(2) + '</td></tr>';
      }
      var lucky = rawE > 1;
      var detail =
        '<table><thead><tr><th>Round</th>' +
        '<th style="text-align:right;">questions</th>' +
        '<th style="text-align:right;">H (bits)</th></tr></thead><tbody>' +
        rows +
        '<tr><td><b>Total</b></td>' +
        '<td style="text-align:right;"><b>' + questionsTotal + '</b></td>' +
        '<td style="text-align:right;"><b>' + Htot.toFixed(2) + '</b></td></tr>' +
        '</tbody></table>' +
        '<p>You spent <b>' + questionsTotal + '</b> questions against an entropy floor of <b>' +
        Htot.toFixed(2) + ' bits</b> &mdash; efficiency H/Q = <b>' +
        (rawE * 100).toFixed(0) + '%</b>' +
        (lucky ? ' (a lucky run: real answers happened to fall your way, beating the H expectation — capped at 100% for scoring).' : '.') +
        '</p>' +
        '<p>The floor is not a target you should expect to hit exactly: H(X) is the ' +
        '<em>expected</em> minimum. You approach it by making every question halve the ' +
        'remaining probability mass, so each yes/no buys a full bit.</p>';

      var headline = stars === 3 ? 'Surgical interrogation'
        : (stars === 2 ? 'Efficient diagnosis' : 'Fault found');

      pushStatus();
      api.complete({
        stars: stars,
        bits: bits,
        headline: headline,
        detailHTML: detail,
      });
    }

    // ---- wiring ----
    askBtn.addEventListener('click', function () { ask(); });
    clearBtn.addEventListener('click', function () {
      if (revealing || finished) return;
      selected = {};
      api.sfx('click');
      renderGrid();
      updateReadout();
    });

    function onKey(e) {
      if (revealing || finished) return;
      if (e.key === 'Enter') {
        if (!askBtn.disabled) { e.preventDefault(); ask(); }
      }
    }
    document.addEventListener('keydown', onKey);

    // first round
    loadRound();

    return {
      destroy: function () {
        clearTimers();
        document.removeEventListener('keydown', onKey);
      },
    };
  },
});

})();
