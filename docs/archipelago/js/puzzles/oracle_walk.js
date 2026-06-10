/* THE QUIET ARCHIPELAGO — oracle-walk (prediction corridor).
   The prophecy corridor of the Mirror Spires. The floor spells a message; at
   each step you guess the next glyph from three candidates. Guess well and you
   pay ~1 bit; guess blind and the bill hugs log2(3) ≈ 1.58 — the blind line.
   First visit walks ONE corridor in two stages: a VEILED stage (~8 steps, no
   context, the bits/step meter hugs the blind line) and a REVEALED stage (the
   walked prefix shows its letters; same walker, same glyphs, the meter falls).
   Nothing changed but what you KNOW. Your total is your cross-entropy:
   prediction IS compression.
   Gate: config par re-budgeted so veiled steps cost the blind line —
   effective = par + blind × (1.58 − par/len). Repeats (taught) skip the hook
   and the veiled stage: straight contextful walk at the original config par.
   Contract: ../../DESIGN.md schema #12 + ../../PEDAGOGY.md §6.12.
   IIFE, no globals, styles under ow-. */
(function () {
'use strict';

/* ============================ pure logic ============================ */

// rank among 3 candidates -> bits paid (DESIGN.md spec: 1 / 1.58 / 2.58)
function costForRank(rank) {
  if (rank <= 1) return 1.0;
  if (rank === 2) return 1.58;
  return 2.58;
}

// the blind line: log2(3), as the rank table charges it
var BLIND_BITS = 1.58;

// expected bits/step for random candidate tapping (kill-switch arithmetic):
// uniform over ranks -> (1 + 1.58 + 2.58)/3 = 1.72 > any sane par rate.
function expectedRandomStepBits() { return (1 + 1.58 + 2.58) / 3; }

// veiled opening steps on a first visit (~8; fewer on short corridors)
function blindStepsFor(len) { return Math.max(0, Math.min(8, Math.floor(len / 2))); }

// GATE (PEDAGOGY §6.12): config par prices the corridor at par/len bits per
// step. The veiled steps are re-budgeted at the blind line instead — nobody
// beats par while knowing nothing — so a good player must beat the config's
// per-step rate only on the contextful stage.
function effectivePar(par, len, blindSteps) {
  if (!(len > 0)) return par;
  return par + blindSteps * (BLIND_BITS - par / len);
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
    '.ow-wrap{display:flex;flex-direction:column;gap:0.8rem;}',
    '.ow-flavor{color:var(--muted);font-size:0.86rem;line-height:1.5;font-style:italic;}',
    '.ow-flavor b{color:var(--purple);font-style:normal;}',
    '.ow-corridor{display:flex;flex-wrap:wrap;gap:3px;justify-content:center;background:var(--surface);',
      'border:1px solid var(--surface2);border-radius:12px;padding:0.6rem;}',
    '.ow-tile{min-width:26px;height:34px;display:flex;align-items:center;justify-content:center;',
      'font-size:1.05rem;border-radius:6px;background:#120e26;color:#3a325c;border:1px solid #221a40;',
      'font-variant-numeric:tabular-nums;transition:background 0.25s,color 0.25s,box-shadow 0.25s;}',
    '.ow-tile.ow-free{background:#241d44;color:var(--purple);border-color:#3a2f63;}',
    '.ow-tile.ow-now{box-shadow:0 0 0 2px var(--purple),0 0 12px var(--purple);color:var(--text);}',
    '.ow-tile.ow-dark{color:#2a2348;}',
    '.ow-tile.ow-c1{background:#16432f;color:#7bf0b4;border-color:#1f6347;}',     /* green 1.0 */
    '.ow-tile.ow-c2{background:#4a3d14;color:#fbd96b;border-color:#6b5a1f;}',     /* yellow 1.58 */
    '.ow-tile.ow-c3{background:#4a1d22;color:#f9a8a8;border-color:#6b2a31;}',     /* red 2.58 */
    '.ow-tile.ow-space{font-size:0.78rem;color:var(--dim);}',
    '.ow-tile.ow-pop{animation:ow-pop 0.5s ease;}',
    '@keyframes ow-pop{0%{transform:scale(0.55);}60%{transform:scale(1.18);}100%{transform:scale(1);}}',
    '.ow-meterwrap{display:flex;flex-direction:column;gap:0.3rem;}',
    '.ow-meterhead{display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.2rem 0.8rem;',
      'font-size:0.78rem;color:var(--muted);}',
    '.ow-meterhead b{color:var(--text);font-variant-numeric:tabular-nums;}',
    '.ow-chart svg{display:block;width:100%;height:auto;background:#0b1222;',
      'border:1px solid var(--surface2);border-radius:10px;}',
    '.ow-prompt{text-align:center;font-size:0.92rem;min-height:1.2rem;color:var(--text);}',
    '.ow-prompt b{color:var(--purple);}',
    '.ow-cands{display:flex;gap:0.6rem;justify-content:center;flex-wrap:wrap;}',
    '.ow-cand{min-width:64px;min-height:64px;font-size:2rem;border-radius:12px;border:2px solid var(--surface2);',
      'background:var(--surface);color:var(--text);cursor:pointer;transition:all 0.12s;font-variant-numeric:tabular-nums;}',
    '.ow-cand:hover:not(:disabled){border-color:var(--purple);color:var(--purple);transform:translateY(-2px);}',
    '.ow-cand.ow-gray{opacity:0.32;text-decoration:line-through;cursor:default;border-color:var(--surface2);color:var(--muted);}',
    '.ow-cand.ow-right{border-color:var(--green);background:rgba(52,211,153,0.18);color:var(--green);}',
    '.ow-cand.ow-whisper{border-color:var(--purple);box-shadow:0 0 12px rgba(167,139,250,0.7);}',
    '.ow-cand:disabled{cursor:default;}',
    '.ow-fb{text-align:center;min-height:1.2rem;font-size:0.9rem;font-weight:600;}',
    '.ow-fb.ow-g{color:var(--green);}.ow-fb.ow-y{color:var(--yellow);}.ow-fb.ow-r{color:var(--red);}',
    '.ow-stats{display:flex;gap:0.6rem;flex-wrap:wrap;margin-bottom:0.4rem;}',
    '.ow-stat{flex:1 1 150px;background:rgba(167,139,250,0.08);border:1px solid var(--surface2);',
      'border-radius:10px;padding:0.5rem 0.65rem;display:flex;flex-direction:column;gap:0.12rem;}',
    '.ow-stat span{font-size:0.68rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted);}',
    '.ow-stat b{font-size:1.3rem;color:var(--cyan);font-variant-numeric:tabular-nums;}',
    '.ow-stat i{font-size:0.72rem;color:var(--dim);font-style:normal;}',
  ].join('');
  document.head.appendChild(s);
}

/* ============================ mechanic ============================ */

G.puzzles.register('oracle-walk', {
  title: 'The Prophecy Corridor',

  // pure functions exposed for the scratch logic test (_smoke/pz_test_oracle-walk.mjs)
  _test: {
    costForRank: costForRank,
    expectedRandomStepBits: expectedRandomStepBits,
    blindStepsFor: blindStepsFor,
    effectivePar: effectivePar,
    sanitizeText: sanitizeText,
    pickDecoys: pickDecoys,
    makeCandidates: makeCandidates,
    BLIND_BITS: BLIND_BITS,
    FREQ: FREQ,
  },

  create: function (root, config, api) {
    ensureStyle();

    var text = sanitizeText(config.text || 'a quiet fox remembers the way');
    if (!text) text = 'the oracle hums';
    var basePar = (typeof config.bitsBudget === 'number' && config.bitsBudget > 0)
      ? config.bitsBudget
      : Math.round(text.length * 1.45 * 10) / 10; // generous default ~1.45 bits/step

    // taught repeats skip the hook AND the veiled stage: straight contextful
    // walk (original structure: lit prefix, original config par).
    var wasTaught = !!(G.pz && G.pz.taught('oracle-walk'));
    var freeCount = wasTaught
      ? Math.min(text.length <= 8 ? Math.max(1, text.length - 1) : 7, text.length)
      : 0;
    var blind = wasTaught ? 0 : blindStepsFor(text.length);
    var nSteps = text.length - freeCount;           // predictions this walk
    var budget = wasTaught ? basePar : effectivePar(basePar, text.length, blind);
    var parPace = wasTaught
      ? (nSteps > 0 ? basePar / nSteps : 0)         // original per-step rate
      : basePar / text.length;                      // rate stage 2 must beat

    var pos = freeCount;       // index of the tile being predicted
    var spent = 0;
    var costs = [];            // bits paid per prediction, in step order
    var triedThisStep = [];
    var candidates = [];
    var trueCh = '';
    var seamDone = blind === 0;
    var meterCoached = false;
    var whisper = false;       // hint-ladder cap: highlight the likely glyph
    var done = false;
    var completed = false;
    var timers = [];

    var ladder = G.pz.hintLadder([
      'Blind or not — common glyphs first. When nothing else speaks, try ⟨e⟩, ⟨t⟩, ⟨a⟩ before the rare ones.',
      'Read the word the floor is spelling. The corridor speaks plain words — let the word finish itself.',
      'Walk with me. Each step I will whisper the likely glyph — take the one that glows.',
    ]);

    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function pushStatus() {
      api.status('spent ' + spent.toFixed(2) + ' / ' + budget.toFixed(2) + ' bits &middot; tile ' +
        Math.min(pos, text.length) + '/' + text.length);
    }

    /* ---- DOM scaffold ---- */
    root.innerHTML =
      '<div class="ow-wrap">' +
        '<div class="ow-flavor">The Warden fox stands by the dark corridor. <b>You are the oracle now.</b> ' +
          'Each stone costs what your guess costs: 1 bit first try, 1.58 second, 2.58 last.</div>' +
        '<div id="ow-hook"></div>' +
        '<div id="ow-coach"></div>' +
        '<div id="ow-stage" style="display:none">' +
          '<div id="ow-round"></div>' +
          '<div class="ow-corridor" id="ow-cor"></div>' +
          '<div class="ow-meterwrap">' +
            '<div class="ow-meterhead"><span>bits per step — running average</span>' +
              '<span><b id="ow-spent">0.00</b> spent — stay under <b>' + budget.toFixed(2) + '</b> bits</span></div>' +
            '<div class="ow-chart" id="ow-chart"></div>' +
          '</div>' +
          '<div class="ow-prompt" id="ow-prompt"></div>' +
          '<div class="ow-cands" id="ow-cands"></div>' +
          '<div class="ow-fb" id="ow-fb">&nbsp;</div>' +
          '<div id="ow-end"></div>' +
        '</div>' +
      '</div>';

    var hookEl = root.querySelector('#ow-hook');
    var coachEl = root.querySelector('#ow-coach');
    var stageEl = root.querySelector('#ow-stage');
    var roundEl = root.querySelector('#ow-round');
    var corEl = root.querySelector('#ow-cor');
    var spentEl = root.querySelector('#ow-spent');
    var chartEl = root.querySelector('#ow-chart');
    var promptEl = root.querySelector('#ow-prompt');
    var candsEl = root.querySelector('#ow-cands');
    var fbEl = root.querySelector('#ow-fb');
    var endEl = root.querySelector('#ow-end');

    function setCoach(html) {
      coachEl.innerHTML = '';
      if (html) coachEl.appendChild(G.pz.coachCard('warden', html));
    }

    function setRound(n) {
      roundEl.innerHTML = '';
      if (wasTaught || blind === 0) return;
      roundEl.appendChild(G.pz.roundBanner(n, 2,
        n === 1 ? 'the veiled walk — guess with nothing' : 'the revealed walk — read as you go'));
    }

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

    /* ---- the meter: per-step bars + stage-wise running average,
            blind line at 1.58, par pace, seam where the veil lifts ---- */
    function renderChart() {
      var W = 480, H = 136, Lp = 30, Rp = 6, Tp = 16, Bp = 14;
      var iw = W - Lp - Rp, ih = H - Tp - Bp, maxY = 2.8;
      function Y(v) { return Tp + (1 - Math.min(v, maxY) / maxY) * ih; }
      var stepW = nSteps > 0 ? iw / nSteps : iw;
      function X(k) { return Lp + (k + 0.5) * stepW; }
      var seamX = Lp + blind * stepW;
      var p = [];
      p.push('<rect x="' + Lp + '" y="' + Tp + '" width="' + iw + '" height="' + ih + '" fill="rgba(255,255,255,0.02)"/>');
      if (blind > 0) {
        p.push('<rect x="' + Lp + '" y="' + Tp + '" width="' + (seamX - Lp).toFixed(1) +
          '" height="' + ih + '" fill="rgba(167,139,250,0.10)"/>');
      }
      // faint gridlines + axis labels
      [1, 2].forEach(function (v) {
        p.push('<line x1="' + Lp + '" x2="' + (W - Rp) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) +
          '" stroke="#26324a" stroke-width="1"/>');
        p.push('<text x="' + (Lp - 4) + '" y="' + (Y(v) + 3).toFixed(1) +
          '" text-anchor="end" font-size="10" fill="#64748b">' + v + '</text>');
      });
      // per-step cost bars, colored by rank
      var bw = Math.max(1.2, stepW * 0.62);
      for (var k = 0; k < costs.length; k++) {
        var c = costs[k];
        var col = c <= 1 ? '#34d399' : c <= 1.6 ? '#fbbf24' : '#f87171';
        p.push('<rect x="' + (X(k) - bw / 2).toFixed(1) + '" y="' + Y(c).toFixed(1) +
          '" width="' + bw.toFixed(1) + '" height="' + (Tp + ih - Y(c)).toFixed(1) +
          '" fill="' + col + '" opacity="0.38"/>');
      }
      // the blind line
      p.push('<line x1="' + Lp + '" x2="' + (W - Rp) + '" y1="' + Y(BLIND_BITS).toFixed(1) +
        '" y2="' + Y(BLIND_BITS).toFixed(1) + '" stroke="#fbbf24" stroke-width="1.4" stroke-dasharray="5 4" opacity="0.85"/>');
      p.push('<text x="' + (W - Rp - 2) + '" y="' + (Y(BLIND_BITS) - 4).toFixed(1) +
        '" text-anchor="end" font-size="12" fill="#fbbf24">blind line log₂3 ≈ 1.58</text>');
      p.push('<text x="' + (Lp - 4) + '" y="' + (Y(BLIND_BITS) + 3).toFixed(1) +
        '" text-anchor="end" font-size="10" fill="#fbbf24">1.58</text>');
      // par pace (the rate to beat with context)
      if (parPace > 0) {
        p.push('<line x1="' + (blind > 0 ? seamX.toFixed(1) : Lp) + '" x2="' + (W - Rp) +
          '" y1="' + Y(parPace).toFixed(1) + '" y2="' + Y(parPace).toFixed(1) +
          '" stroke="#34d399" stroke-width="1.4" stroke-dasharray="3 4" opacity="0.8"/>');
        p.push('<text x="' + (W - Rp - 2) + '" y="' + (Y(parPace) + 13).toFixed(1) +
          '" text-anchor="end" font-size="12" fill="#34d399">par pace ' + parPace.toFixed(2) + '</text>');
      }
      // the seam
      if (blind > 0 && nSteps > blind) {
        p.push('<line x1="' + seamX.toFixed(1) + '" x2="' + seamX.toFixed(1) + '" y1="' + Tp +
          '" y2="' + (Tp + ih) + '" stroke="#a78bfa" stroke-width="1.4" stroke-dasharray="2 3"/>');
        p.push('<text x="' + (seamX + 3).toFixed(1) + '" y="' + (Tp + 10) +
          '" font-size="11" fill="#a78bfa">veil lifts</text>');
      }
      // stage-wise running-average lines
      function avgLine(from, to, col) {
        var pts = [], sum = 0, n = 0;
        for (var i = from; i < Math.min(to, costs.length); i++) {
          sum += costs[i]; n++;
          pts.push(X(i).toFixed(1) + ',' + Y(sum / n).toFixed(1));
        }
        if (!pts.length) return '';
        var out = '';
        if (pts.length > 1) out += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + col + '" stroke-width="2"/>';
        var last = pts[pts.length - 1].split(',');
        out += '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="3" fill="' + col + '"/>';
        return out;
      }
      p.push(avgLine(0, blind, '#fbd96b'));
      p.push(avgLine(blind, nSteps, '#22d3ee'));
      chartEl.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="bits per step">' +
        p.join('') + '</svg>';
    }

    function updateMeter() {
      spentEl.textContent = spent.toFixed(2);
      renderChart();
    }

    /* ---- the seam: reveal the walked prefix ---- */
    function seam() {
      seamDone = true;
      for (var i = 0; i < blind; i++) {
        var t = tileEls[i];
        t.textContent = glyph(text[i]);
        if (text[i] === ' ') t.classList.add('ow-space');
        t.classList.add('ow-pop');
      }
      setRound(2);
      setCoach('The veil lifts. Same corridor. Same walker. <b>Nothing changed but what you KNOW.</b> ' +
        'Watch the meter fall.');
      promptEl.textContent = 'The walked stones reveal their glyphs…';
      candsEl.innerHTML = '';
      fbEl.innerHTML = '&nbsp;';
      fbEl.className = 'ow-fb';
      api.sfx('spark');
      later(renderStep, 1100);
    }

    /* ---- candidate buttons ---- */
    function renderStep() {
      if (done) return;
      if (pos >= text.length) { win(); return; }
      if (!seamDone && pos - freeCount >= blind) { seam(); return; }
      trueCh = text[pos];
      triedThisStep = [];
      var prefix = text.slice(0, pos);
      var decoys = pickDecoys(trueCh, prefix, api.rng);
      candidates = makeCandidates(trueCh, decoys, api.rng);
      markNow();
      var stepIdx = pos - freeCount;
      var isBlind = stepIdx < blind;
      var base = isBlind
        ? 'Veiled stone ' + (stepIdx + 1) + ' of ' + blind + ' — guess the glyph.'
        : 'Tile ' + (pos + 1) + ' of ' + text.length + ' — which glyph lights next?';
      promptEl.innerHTML = base + (whisper ? ' <b>The Warden whispers: ⟨' + glyph(trueCh) + '⟩.</b>' : '');
      fbEl.innerHTML = '&nbsp;';
      fbEl.className = 'ow-fb';
      candsEl.innerHTML = '';
      candidates.forEach(function (ch) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ow-cand';
        b.textContent = glyph(ch);
        if (ch === ' ') b.style.fontSize = '1rem';
        if (whisper && ch === trueCh) b.classList.add('ow-whisper');
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
      var stepIdx = pos - freeCount;
      var isBlind = stepIdx < blind;
      spent += cost;
      costs.push(cost);
      btn.classList.add('ow-right');
      // light the corridor tile colored by cost; veiled tiles keep the glyph hidden
      var tile = tileEls[pos];
      tile.classList.remove('ow-dark', 'ow-now');
      if (!isBlind) {
        tile.textContent = glyph(trueCh);
        if (trueCh === ' ') tile.classList.add('ow-space');
      }
      tile.classList.add(rank === 1 ? 'ow-c1' : rank === 2 ? 'ow-c2' : 'ow-c3');

      var cls = rank === 1 ? 'ow-g' : rank === 2 ? 'ow-y' : 'ow-r';
      fbEl.textContent = '✦ ' + glyph(trueCh) + ' — paid ' + cost.toFixed(2) + ' bit' + (cost === 1 ? '' : 's') +
        (rank === 1 ? ' (first guess!)' : rank === 2 ? ' (second guess)' : ' (last guess)');
      fbEl.className = 'ow-fb ' + cls;
      api.sfx(rank === 1 ? 'spark' : 'select');

      // disable remaining buttons this step
      Array.prototype.forEach.call(candsEl.children, function (c) { c.disabled = true; });
      updateMeter();
      pos++;
      pushStatus();

      // GUIDE beat: a few veiled steps in, read the meter aloud once
      if (!wasTaught && !meterCoached && blind >= 4 && pos - freeCount === 4) {
        meterCoached = true;
        setCoach('See the meter cling to the <b>blind line</b>? Not carelessness — ' +
          'there is simply nothing to hold on to. Yet.');
      }

      if (spent > budget + 1e-9) { later(lose, 700); return; }
      if (pos >= text.length) { later(win, 500); return; }
      later(renderStep, 380);
    }

    /* ---- gate fail: over the bits cap -> hint ladder + fresh reset ---- */
    function lose() {
      if (done) return;
      api.fail('Over ' + budget.toFixed(2) + ' bits — the corridor dims. Walk it again.');
      var hint = ladder.fail();
      if (hint) {
        if (ladder.count() >= 4) whisper = true;
        setCoach(hint);
      } else {
        setCoach('Too many bits. The stones go dark — same corridor, fresh decoys. Walk it again.');
      }
      reset();
    }

    function reset() {
      pos = freeCount;
      spent = 0;
      costs = [];
      triedThisStep = [];
      seamDone = blind === 0;
      done = false;
      buildCorridor();
      setRound(1);
      updateMeter();
      fbEl.textContent = 'The stones go dark again. Fresh decoys — the corridor does not repeat its tricks.';
      fbEl.className = 'ow-fb ow-y';
      endEl.innerHTML = '';
      renderStep();
    }

    /* ---- win: debrief with their stage numbers ---- */
    function win() {
      if (done) return;
      done = true;
      ladder.reset();
      tileEls.forEach(function (t) { t.classList.remove('ow-now'); });
      candsEl.innerHTML = '';
      promptEl.textContent = 'The corridor is fully lit.';
      fbEl.innerHTML = '&nbsp;';
      fbEl.className = 'ow-fb';
      pushStatus();
      if (!wasTaught) G.pz.markTaught('oracle-walk');

      var fmt = G.pz.fmt;
      var blindBits = 0, ctxBits = 0, k;
      for (k = 0; k < costs.length; k++) {
        if (k < blind) blindBits += costs[k]; else ctxBits += costs[k];
      }
      var ctxN = costs.length - blind;
      var blindAvg = blind > 0 ? blindBits / blind : 0;
      var ctxAvg = ctxN > 0 ? ctxBits / ctxN : 0;
      var html;
      if (blind > 0) {
        html =
          '<div class="ow-stats">' +
            '<div class="ow-stat"><span>veiled — knowing nothing</span><b>' + fmt(blindAvg) +
              '</b><i>bits/step · blind line 1.58</i></div>' +
            '<div class="ow-stat"><span>revealed — reading the words</span><b>' + fmt(ctxAvg) +
              '</b><i>bits/step · par pace ' + fmt(parPace) + '</i></div>' +
          '</div>' +
          'Same corridor, same glyphs — the only thing that changed at the seam was what you ' +
          '<b>knew</b>. Your total, <span class="pzk-eq">' + fmt(spent) + ' bits</span>, is your ' +
          '<b>cross-entropy</b> on this corridor: a scribe who borrowed your guesses could write the ' +
          'whole message in exactly that many bits. A language model is graded on exactly this walk — ' +
          'and a model that guesses in fewer bits can compress this corridor into exactly that many. ' +
          '<b>Prediction IS compression.</b>';
      } else {
        html =
          '<span class="pzk-eq">' + fmt(spent) + ' bits over ' + costs.length + ' glyphs = ' +
          fmt(costs.length > 0 ? spent / costs.length : 0) + ' bits/step</span> — under the blind line ' +
          '1.58 because you conditioned on the words so far. That score is your <b>cross-entropy</b>: ' +
          'a model that guesses in fewer bits can compress this corridor into exactly that many. ' +
          '<b>Prediction IS compression.</b>';
      }
      endEl.innerHTML = '';
      endEl.appendChild(G.pz.debriefCard({
        title: 'The oracle goes quiet — the message is whole.',
        html: html,
        buttonLabel: 'Take the corridor',
        tone: 'win',
        onButton: function () {
          if (completed) return;
          completed = true;
          api.complete();
        },
      }));
      api.sfx('spark');
    }

    /* ---- boot: hook on first encounter, straight walk when taught ---- */
    function startWalk() {
      stageEl.style.display = '';
      setRound(1);
      buildCorridor();
      updateMeter();
      renderStep();
    }

    if (wasTaught) {
      startWalk();
    } else {
      hookEl.appendChild(G.pz.hookCard({
        question: 'You will guess the corridor\'s next glyph, over and over, from 3 candidates. ' +
          'What is the WORST your average price can be?',
        options: [
          { label: '1 bit', note: 'always right' },
          { label: 'log₂3 ≈ 1.58 bits', note: 'an honest 3-way split' },
          { label: '2.58 bits', note: 'always last' },
        ],
        correct: 1,
        reveal: 'Know <b>nothing</b> and split your belief three ways: the bill averages log₂3 ≈ ' +
          '<b>1.58 bits</b> a step — the <b>blind line</b>. No strategy that knows nothing beats it. ' +
          'The first ' + blind + ' stones are veiled, so you can feel it.',
        doneLabel: 'Walk the veiled stones',
        onDone: function () {
          hookEl.innerHTML = '';
          setCoach(blind + ' stones, veiled. Spend your guesses and watch the meter — ' +
            'feel what knowing <b>nothing</b> costs.');
          startWalk();
        },
      }));
    }

    return {
      destroy: function () {
        clearTimers();
        root.innerHTML = '';
      },
    };
  },
});

})();
