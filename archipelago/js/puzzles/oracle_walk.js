/* THE QUIET ARCHIPELAGO — oracle-walk (prediction corridor).
   The prophecy corridor of the Mirror Spires. The floor spells a message; tiles
   ahead are dark. At each step you guess the next glyph from three candidates.
   Guess well and you pay ~1 bit; guess blind and you pay log2(3) ≈ 1.58 on
   average. You ARE the language model; your score is your cross-entropy.
   Contract: ../../DESIGN.md schema #12. IIFE, no globals. */
(function () {
'use strict';

/* ============================ pure logic ============================ */

// rank among 3 candidates -> bits paid (DESIGN.md spec: 1 / 1.58 / 2.58)
function costForRank(rank) {
  if (rank <= 1) return 1.0;
  if (rank === 2) return 1.58;
  return 2.58;
}

// english letter frequency order (most -> least) for plausible decoys
var FREQ = 'etaoinshrdlcumwfgypbvkjxqz';
// common bigram continuations: prev char -> a likely next letter (decoy seed)
var BIGRAM = {
  t: 'h', h: 'e', a: 'n', s: 't', e: 'r', o: 'u', i: 'n', n: 'g',
  c: 'h', w: 'h', d: 'e', l: 'e', r: 'e', m: 'e', f: 'o', g: 'h',
  b: 'e', p: 'r', u: 'r', y: 'o', v: 'e', k: 'e', ' ': 't', j: 'u',
  q: 'u', x: 'p', z: 'e',
};

function sanitizeText(t) {
  return String(t == null ? '' : t).toLowerCase().replace(/[^a-z ]/g, '');
}

// deterministic-ish decoy picker: never duplicates the true char; exactly 2 decoys
function pickDecoys(trueCh, prefix, rng) {
  var isSpace = trueCh === ' ';
  var pool;
  if (isSpace) {
    pool = FREQ.split(''); // truth is a space -> decoys are letters
  } else {
    pool = FREQ.split('').filter(function (c) { return c !== trueCh; });
    var last = prefix.charAt(prefix.length - 1);
    var cont = BIGRAM[last];
    if (cont && cont !== trueCh) { pool.unshift(cont); pool.unshift(cont); } // weight the bigram pick
    // sometimes offer a space as a decoy for letters (fairness/variety)
    if (rng() < 0.22) { pool.push(' '); pool.push(' '); }
  }
  var out = [], guard = 0, idx, c;
  while (out.length < 2 && guard < 400) {
    guard++;
    idx = Math.floor(rng() * pool.length);
    c = pool[idx];
    if (c === trueCh) continue;
    if (out.indexOf(c) >= 0) continue;
    out.push(c);
  }
  // safety fill (shouldn't trigger with the pools above)
  var fb = FREQ.split('');
  for (var k = 0; out.length < 2 && k < fb.length; k++) {
    if (fb[k] !== trueCh && out.indexOf(fb[k]) < 0) out.push(fb[k]);
  }
  return out;
}

// Fisher–Yates shuffle of [true, d1, d2] using rng — keeps true char present
function makeCandidates(trueCh, decoys, rng) {
  var arr = [trueCh].concat(decoys), i, j, t;
  for (i = arr.length - 1; i > 0; i--) {
    j = Math.floor(rng() * (i + 1));
    t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

function glyph(ch) { return ch === ' ' ? '␣' : ch; }

/* ============================ style ============================ */

var STYLE_ID = 'ow-style';
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  var s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = [
    '.ow-wrap{display:flex;flex-direction:column;gap:0.85rem;}',
    '.ow-flavor{color:var(--muted);font-size:0.86rem;line-height:1.5;font-style:italic;}',
    '.ow-flavor b{color:var(--purple);font-style:normal;}',
    '.ow-corridor{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;background:var(--surface);',
      'border:1px solid var(--surface2);border-radius:12px;padding:0.7rem;}',
    '.ow-tile{min-width:30px;height:38px;display:flex;align-items:center;justify-content:center;',
      'font-size:1.15rem;border-radius:6px;background:#120e26;color:#3a325c;border:1px solid #221a40;',
      'font-variant-numeric:tabular-nums;transition:background 0.25s,color 0.25s,box-shadow 0.25s;}',
    '.ow-tile.ow-free{background:#241d44;color:var(--purple);border-color:#3a2f63;}',
    '.ow-tile.ow-now{box-shadow:0 0 0 2px var(--purple),0 0 12px var(--purple);color:var(--text);}',
    '.ow-tile.ow-dark{color:#2a2348;}',
    '.ow-tile.ow-c1{background:#16432f;color:#7bf0b4;border-color:#1f6347;}',     /* green 1.0 */
    '.ow-tile.ow-c2{background:#4a3d14;color:#fbd96b;border-color:#6b5a1f;}',     /* yellow 1.58 */
    '.ow-tile.ow-c3{background:#4a1d22;color:#f9a8a8;border-color:#6b2a31;}',     /* red 2.58 */
    '.ow-tile.ow-space{font-size:0.8rem;color:var(--dim);}',
    '.ow-teach{text-align:center;font-size:0.88rem;line-height:1.5;color:var(--text);}',
    '.ow-teach b{color:var(--cyan);}',
    '.ow-meterwrap{display:flex;flex-direction:column;gap:0.3rem;}',
    '.ow-meterhead{display:flex;justify-content:space-between;font-size:0.78rem;color:var(--muted);}',
    '.ow-meterhead b{color:var(--text);font-variant-numeric:tabular-nums;}',
    '.ow-bar{height:12px;background:var(--surface2);border-radius:6px;overflow:hidden;}',
    '.ow-barfill{height:100%;width:0%;background:linear-gradient(90deg,var(--green),var(--yellow),var(--red));',
      'border-radius:6px;transition:width 0.3s;}',
    '.ow-prompt{text-align:center;font-size:0.92rem;min-height:1.2rem;color:var(--text);}',
    '.ow-cands{display:flex;gap:0.6rem;justify-content:center;flex-wrap:wrap;}',
    '.ow-cand{min-width:64px;min-height:64px;font-size:2rem;border-radius:12px;border:2px solid var(--surface2);',
      'background:var(--surface);color:var(--text);cursor:pointer;transition:all 0.12s;font-variant-numeric:tabular-nums;}',
    '.ow-cand:hover:not(:disabled){border-color:var(--purple);color:var(--purple);transform:translateY(-2px);}',
    '.ow-cand.ow-gray{opacity:0.32;text-decoration:line-through;cursor:default;border-color:var(--surface2);color:var(--muted);}',
    '.ow-cand.ow-right{border-color:var(--green);background:rgba(52,211,153,0.18);color:var(--green);}',
    '.ow-cand:disabled{cursor:default;}',
    '.ow-fb{text-align:center;min-height:1.2rem;font-size:0.9rem;font-weight:600;}',
    '.ow-fb.ow-g{color:var(--green);}.ow-fb.ow-y{color:var(--yellow);}.ow-fb.ow-r{color:var(--red);}',
    '.ow-lesson{background:rgba(167,139,250,0.1);border:1px solid var(--purple);border-radius:12px;',
      'padding:0.9rem;font-size:0.9rem;line-height:1.55;color:var(--text);}',
    '.ow-lesson b{color:var(--purple);}',
  ].join('');
  document.head.appendChild(s);
}

/* ============================ mechanic ============================ */

G.puzzles.register('oracle-walk', {
  title: 'The Prophecy Corridor',
  create: function (root, config, api) {
    ensureStyle();

    var text = sanitizeText(config.text || 'a quiet fox remembers the way');
    if (!text) text = 'the oracle hums';
    var budget = (typeof config.bitsBudget === 'number' && config.bitsBudget > 0)
      ? config.bitsBudget
      : Math.round(text.length * 1.45 * 10) / 10; // generous default ~1.45 bits/step
    var freeCount = Math.min(text.length <= 8 ? Math.max(1, text.length - 1) : 7, text.length);

    var pos = freeCount;     // index of the tile we are predicting next
    var spent = 0;
    var triedThisStep = [];  // chars already grayed-out this step
    var candidates = [];     // current 3 candidates (display order)
    var trueCh = '';
    var done = false;
    var timers = [];

    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function pushStatus() {
      api.status('spent ' + spent.toFixed(2) + ' / ' + budget.toFixed(2) + ' bits &middot; tile ' +
        Math.min(pos, text.length) + '/' + text.length);
    }

    /* ---- DOM scaffold ---- */
    root.innerHTML =
      '<div class="ow-wrap">' +
        '<div class="ow-flavor">The Warden fox lights the first stones. <b>You are the oracle now.</b> ' +
          'Read the corridor, then guess what the floor says next.</div>' +
        '<div class="ow-corridor" id="ow-cor"></div>' +
        '<div class="ow-teach">you are doing what a language model does: assigning probability to the next symbol — ' +
          'your score is your <b>cross-entropy</b>.</div>' +
        '<div class="ow-meterwrap">' +
          '<div class="ow-meterhead"><span>bits spent</span><span><b id="ow-spent">0.00</b> / ' + budget.toFixed(2) + '</span></div>' +
          '<div class="ow-bar"><div class="ow-barfill" id="ow-fill"></div></div>' +
        '</div>' +
        '<div class="ow-prompt" id="ow-prompt">Which glyph comes next?</div>' +
        '<div class="ow-cands" id="ow-cands"></div>' +
        '<div class="ow-fb" id="ow-fb">&nbsp;</div>' +
        '<div id="ow-end"></div>' +
      '</div>';

    var corEl = root.querySelector('#ow-cor');
    var spentEl = root.querySelector('#ow-spent');
    var fillEl = root.querySelector('#ow-fill');
    var promptEl = root.querySelector('#ow-prompt');
    var candsEl = root.querySelector('#ow-cands');
    var fbEl = root.querySelector('#ow-fb');
    var endEl = root.querySelector('#ow-end');

    /* ---- corridor tiles ---- */
    var tileEls = [];
    function buildCorridor() {
      corEl.innerHTML = '';
      tileEls = [];
      for (var i = 0; i < text.length; i++) {
        var t = document.createElement('div');
        t.className = 'ow-tile';
        var ch = text[i];
        if (i < freeCount) {
          t.classList.add('ow-free');
          t.textContent = glyph(ch);
          if (ch === ' ') t.classList.add('ow-space');
        } else {
          t.classList.add('ow-dark');
          t.textContent = '·';
        }
        corEl.appendChild(t);
        tileEls.push(t);
      }
    }

    function markNow() {
      tileEls.forEach(function (t, i) { t.classList.toggle('ow-now', i === pos); });
    }

    function updateMeter() {
      spentEl.textContent = spent.toFixed(2);
      var pct = budget > 0 ? Math.min(100, spent / budget * 100) : 0;
      fillEl.style.width = pct.toFixed(1) + '%';
    }

    /* ---- candidate buttons ---- */
    function renderStep() {
      if (pos >= text.length) { win(); return; }
      trueCh = text[pos];
      triedThisStep = [];
      var prefix = text.slice(0, pos);
      var decoys = pickDecoys(trueCh, prefix, api.rng);
      candidates = makeCandidates(trueCh, decoys, api.rng);
      markNow();
      promptEl.textContent = 'Tile ' + (pos + 1) + ': which glyph lights next?';
      fbEl.textContent = ' ';
      fbEl.className = 'ow-fb';
      candsEl.innerHTML = '';
      candidates.forEach(function (ch) {
        var b = document.createElement('button');
        b.className = 'ow-cand';
        b.textContent = glyph(ch);
        if (ch === ' ') b.style.fontSize = '1rem';
        b.addEventListener('click', function () { onPick(ch, b); });
        candsEl.appendChild(b);
      });
      pushStatus();
    }

    function onPick(ch, btn) {
      if (done) return;
      if (btn.classList.contains('ow-gray') || btn.classList.contains('ow-right')) return;

      if (ch !== trueCh) {
        // wrong: gray it out, costs nothing yet (cost is by final rank)
        if (triedThisStep.indexOf(ch) < 0) triedThisStep.push(ch);
        btn.classList.add('ow-gray');
        btn.disabled = true;
        fbEl.textContent = 'Not ' + glyph(ch) + '. The stone stays dark.';
        fbEl.className = 'ow-fb ow-y';
        api.sfx('bump');
        return;
      }

      // correct: rank = (#wrong tries before this) + 1
      var rank = triedThisStep.length + 1;
      var cost = costForRank(rank);
      spent += cost;
      btn.classList.add('ow-right');
      // light the corridor tile colored by cost
      var tile = tileEls[pos];
      tile.classList.remove('ow-dark', 'ow-now');
      tile.textContent = glyph(trueCh);
      if (trueCh === ' ') tile.classList.add('ow-space');
      tile.classList.add(rank === 1 ? 'ow-c1' : rank === 2 ? 'ow-c2' : 'ow-c3');

      var cls = rank === 1 ? 'ow-g' : rank === 2 ? 'ow-y' : 'ow-r';
      fbEl.textContent = '✦ ' + glyph(trueCh) + ' — paid ' + cost.toFixed(2) + ' bit' + (cost === 1 ? '' : 's') +
        (rank === 1 ? ' (first guess!)' : rank === 2 ? ' (second guess)' : ' (last guess)');
      fbEl.className = 'ow-fb ' + cls;
      api.sfx(rank === 1 ? 'spark' : 'select');

      // disable remaining buttons this step
      Array.prototype.forEach.call(candsEl.children, function (c) { c.disabled = true; });
      updateMeter();
      pushStatus();

      pos++;
      if (spent > budget + 1e-9) { later(lose, 600); return; }
      if (pos >= text.length) { later(win, 500); return; }
      later(renderStep, 360);
    }

    function win() {
      if (done) return;
      done = true;
      markNow();
      tileEls.forEach(function (t) { t.classList.remove('ow-now'); });
      candsEl.innerHTML = '';
      promptEl.textContent = 'The corridor is fully lit.';
      var perStep = pos > freeCount ? spent / (pos - freeCount) : 0;
      endEl.innerHTML =
        '<div class="ow-lesson"><b>The oracle goes quiet — the message is whole.</b> ' +
        'You spent ' + spent.toFixed(2) + ' bits over ' + (text.length - freeCount) + ' predictions ' +
        '(' + perStep.toFixed(2) + ' bits/step). Good prediction = short description: ' +
        'a <b>perfect predictor</b> of this corridor would pay ~1 bit per step, while a <b>coin-flipper</b> pays ' +
        'log₂3 ≈ 1.58 on average. Prediction <b>is</b> compression.</div>';
      api.sfx('solve');
      api.complete();
    }

    function lose() {
      if (done) return;
      // budget exhausted: fail + auto-reset with the SAME text
      api.fail('The corridor dims. Walk it again.');
      reset();
    }

    function reset() {
      pos = freeCount;
      spent = 0;
      triedThisStep = [];
      done = false;
      buildCorridor();
      updateMeter();
      fbEl.textContent = 'The oracle remembers; so do you. The corridor lights from the start.';
      fbEl.className = 'ow-fb ow-y';
      endEl.innerHTML = '';
      renderStep();
    }

    /* ---- boot ---- */
    buildCorridor();
    updateMeter();
    renderStep();

    return {
      destroy: function () {
        clearTimers();
        root.innerHTML = '';
      },
    };
  },
});

})();
