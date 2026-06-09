/* SIGNAL LOST — 02 · The Imposter (kl-detective)
   KL divergence as discrimination evidence. The player pulls samples off a
   wire and watches the log-likelihood-ratio Λ = Σ log₂ P/Q drift toward the
   live source. Contract + api: ../DESIGN.md, ../engine.js.
   Single-file IIFE, no globals besides the final Game.register. DOM + SVG
   only (no canvas). All state lives inside create() so replays reset cleanly. */
(function () {
'use strict';

/* ===================== pure math (top of IIFE) ===================== */

// Kullback–Leibler divergence D(P‖Q) = Σ P(x) log₂(P(x)/Q(x)), in bits.
// Assumes P, Q same length, all entries > 0 (our distributions are dense).
function kl(P, Q) {
  var s = 0;
  for (var i = 0; i < P.length; i++) {
    if (P[i] > 0) s += P[i] * log2(P[i] / Q[i]);
  }
  return s;
}

function log2(x) { return Math.log(x) / Math.LN2; }

// Per-symbol evidence toward A (Source P): log₂(P(x)/Q(x)) bits.
// This is computed from the DRAWN symbol's index and is independent of which
// source is actually live — that is the whole point of the likelihood ratio.
function evidenceBits(P, Q, idx) { return log2(P[idx] / Q[idx]); }

// Sample an index from a probability vector using a uniform draw u in [0,1).
function sampleIndex(dist, u) {
  var acc = 0;
  for (var i = 0; i < dist.length; i++) {
    acc += dist[i];
    if (u < acc) return i;
  }
  return dist.length - 1; // float guard
}

// Expected draws for the evidence to reach the ±threshold band, ≈ thr / KL.
// Uses KL of the TRUE direction (P‖Q if A live, Q‖P if B live).
function expectedDraws(klTrue, threshold) { return threshold / klTrue; }

// Per-round score in [0,1] given a correct accusation: full credit at or below
// 1.3·nₑ draws, scaling linearly down to a floor of 0.15 at the draw cap.
function roundScore(correct, draws, ne, cap) {
  if (!correct) return 0;
  var full = 1.3 * ne;
  if (draws <= full) return 1;
  var floor = 0.15;
  if (draws >= cap) return floor;
  var t = (draws - full) / (cap - full);   // 0 at full, 1 at cap
  return 1 - (1 - floor) * t;
}

// Clamp helper.
function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

/* ===================== round definitions ===================== */
// Five symbols, dense distributions. KL targets (verified):
//   R1 D(P‖Q)=1.29  (easy)   R2 D(P‖Q)=0.48 / D(Q‖P)=0.41 (asymmetric)
//   R3 D(P‖Q)=0.11  (patient).  All vectors sum to 1, all entries > 0.
var GLYPHS = ['◆', '▲', '●', '■', '✦'];

var ROUNDS = [
  { P: [0.45, 0.27, 0.15, 0.09, 0.04], Q: [0.06, 0.12, 0.20, 0.28, 0.34] },
  { P: [0.38, 0.25, 0.19, 0.12, 0.06], Q: [0.10, 0.22, 0.26, 0.24, 0.18] },
  { P: [0.28, 0.24, 0.20, 0.16, 0.12], Q: [0.16, 0.19, 0.21, 0.22, 0.22] }
];

var THRESHOLD = 5;     // ±5 bits is the "decided" band used for benchmarks
var METER_MAX = 6;     // needle spans −6 .. +6 bits

/* ===================== the game ===================== */

Game.register({
  id: 'kl-detective',
  title: 'The Imposter',
  icon: '🕵️',
  part: 1,
  module: '1B',
  moduleTitle: 'KL Divergence & Mutual Information',
  moduleUrl: '../1b_kl_mutual_information/',
  tagline: 'Two sources, one wire — let the evidence in bits name the liar.',

  briefing:
    '<p>Relay 1B still hums, but something is wrong with the feed. Two ' +
    'transmitters claim the channel: the real station (Source&nbsp;A) and an ' +
    'imposter splice (Source&nbsp;B). Each draws from its own distribution over ' +
    'the same five glyphs. One of them — chosen by a coin you cannot see — is ' +
    'on the wire right now. Pull samples, weigh the evidence, and name the ' +
    'source before you have wasted the whole night listening.</p>' +
    '<ul>' +
    '<li><b>Draw</b> (key&nbsp;<kbd>D</kbd>) pulls one symbol. The evidence ' +
    'meter moves by log₂&nbsp;P(x)/Q(x) bits — toward A if the glyph favours A, ' +
    'toward B if it favours B.</li>' +
    '<li><b>Accuse A</b> (<kbd>A</kbd>) or <b>Accuse B</b> (<kbd>B</kbd>) when ' +
    'you are convinced. Wrong call scores nothing for the round.</li>' +
    '<li>Fewer draws score higher. Each draw carries, on average, exactly ' +
    'D(P‖Q) bits of evidence — so a wider gap means a faster verdict.</li>' +
    '<li>Three rounds, each harder than the last as the two sources blur ' +
    'together.</li>' +
    '</ul>',

  concept:
    '<p>You are running a likelihood-ratio test. After symbols x₁…xₙ the log ' +
    'evidence is Λ = Σ log₂ P(xᵢ)/Q(xᵢ). If Source&nbsp;A (distribution&nbsp;P) ' +
    'is truly live, each draw adds on average <b>D(P‖Q) = Σ P(x) log₂ P(x)/Q(x)</b> ' +
    'bits — the Kullback–Leibler divergence. That is exactly how much evidence, ' +
    'in bits, one sample is worth.</p>' +
    '<p>Stopping when |Λ| crosses a threshold is the sequential probability ' +
    'ratio test (SPRT): it needs only about <b>threshold / KL</b> draws to ' +
    'decide. Note that D(P‖Q) ≠ D(Q‖P) in general — KL is asymmetric, so the ' +
    'wire can take longer to convict one source than the other. KL is the ' +
    'currency of hypothesis testing.</p>',

  create: function (root, api) {
    api.injectStyle(STYLE);

    /* ---- per-run state (reset on every create, no IIFE-level mutables) ---- */
    var timers = [];                 // pending setTimeout ids
    var keyHandler = null;           // document-level keydown listener
    var totalScore = 0;              // sum of round scores in [0,3]
    var totalDraws = 0;
    var totalBench = 0;              // Σ nₑ over the true directions
    var results = [];                // per-round records for the debrief
    var roundIdx = 0;

    // Live round state (re-initialised by startRound).
    var P, Q, klPQ, klQP, klTrue, ne, cap, liveIsA, lambda, drawCount, path, decided;

    /* ---- DOM scaffold ---- */
    var wrap = elem('div', 'kd-wrap');

    var predict = elem('div', 'kd-card kd-predict');
    wrap.appendChild(predict);

    var sources = elem('div', 'kd-sources');
    var colA = buildSourceColumn('A', 'Source A · P', 'kd-a');
    var colB = buildSourceColumn('B', 'Source B · Q', 'kd-b');
    sources.appendChild(colA.col);
    sources.appendChild(colB.col);
    wrap.appendChild(sources);

    // Evidence meter — the core teaching surface.
    var meterCard = elem('div', 'kd-card kd-meter-card');
    meterCard.appendChild(elem('div', 'kd-meter-label',
      'Evidence Λ = Σ log₂ P/Q &nbsp;<span class="kd-dim">(bits)</span>'));
    var meterVal = elem('div', 'kd-meter-val', '0.00 bits');
    meterCard.appendChild(meterVal);
    var track = elem('div', 'kd-track');
    track.appendChild(elem('div', 'kd-track-mid'));
    var fillPos = elem('div', 'kd-fill kd-fill-pos');   // toward A (right)
    var fillNeg = elem('div', 'kd-fill kd-fill-neg');   // toward B (left)
    track.appendChild(fillNeg);
    track.appendChild(fillPos);
    var needle = elem('div', 'kd-needle');
    track.appendChild(needle);
    meterCard.appendChild(track);
    var ends = elem('div', 'kd-ends');
    ends.appendChild(elem('span', 'kd-end-b', '◄ −6 · certainly B'));
    ends.appendChild(elem('span', 'kd-end-a', 'certainly A · +6 ►'));
    meterCard.appendChild(ends);
    var delta = elem('div', 'kd-delta', '&nbsp;');
    meterCard.appendChild(delta);
    wrap.appendChild(meterCard);

    // Tape / log of drawn symbols.
    var tapeCard = elem('div', 'kd-card kd-tape-card');
    tapeCard.appendChild(elem('div', 'kd-tape-label', 'Wire tape'));
    var tape = elem('div', 'kd-tape');
    tapeCard.appendChild(tape);
    wrap.appendChild(tapeCard);

    // Controls.
    var controls = elem('div', 'kd-controls');
    var drawBtn = elem('button', 'btn btn-primary kd-btn', '⟲ Draw <span class="kd-key">D</span>');
    var accuseA = elem('button', 'btn kd-btn kd-accuse-a', 'Accuse A <span class="kd-key">A</span>');
    var accuseB = elem('button', 'btn kd-btn kd-accuse-b', 'Accuse B <span class="kd-key">B</span>');
    controls.appendChild(drawBtn);
    controls.appendChild(accuseA);
    controls.appendChild(accuseB);
    wrap.appendChild(controls);

    // Reveal panel (truth + evidence-path SVG), hidden until accusation.
    var reveal = elem('div', 'kd-card kd-reveal');
    reveal.style.display = 'none';
    wrap.appendChild(reveal);

    root.appendChild(wrap);

    /* ---- behaviour ---- */
    drawBtn.addEventListener('click', onDraw);
    accuseA.addEventListener('click', function () { onAccuse(true); });
    accuseB.addEventListener('click', function () { onAccuse(false); });

    keyHandler = function (e) {
      if (e.key === 'Escape') return;                 // engine owns Escape
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      var k = (e.key || '').toLowerCase();
      if (k === 'd') { e.preventDefault(); onDraw(); }
      else if (k === 'a') { e.preventDefault(); if (!accuseA.disabled) onAccuse(true); }
      else if (k === 'b') { e.preventDefault(); if (!accuseB.disabled) onAccuse(false); }
    };
    document.addEventListener('keydown', keyHandler);

    startRound();

    /* ---- round lifecycle ---- */
    function startRound() {
      var def = ROUNDS[roundIdx];
      P = def.P; Q = def.Q;
      klPQ = kl(P, Q);
      klQP = kl(Q, P);
      liveIsA = api.rng() < 0.5;
      klTrue = liveIsA ? klPQ : klQP;
      ne = expectedDraws(klTrue, THRESHOLD);
      // Cap at ~4× the slower direction's expectation so the round always ends.
      cap = Math.round(4 * expectedDraws(Math.min(klPQ, klQP), THRESHOLD));
      lambda = 0;
      drawCount = 0;
      path = [0];
      decided = false;

      reveal.style.display = 'none';
      reveal.innerHTML = '';
      tape.innerHTML = '';
      delta.innerHTML = '&nbsp;';
      drawBtn.disabled = false;
      accuseA.disabled = false;
      accuseB.disabled = false;

      // Bars for this round.
      renderBars(colA, P);
      renderBars(colB, Q);

      // Prediction line: average drift per draw in each direction.
      predict.innerHTML =
        '<div class="kd-predict-head">Round ' + (roundIdx + 1) + ' of 3 · prediction</div>' +
        '<div class="kd-predict-body">' +
        'If <b class="kd-ca">A</b> is live, evidence drifts <b class="kd-ca">+D(P‖Q) = ' +
        klPQ.toFixed(2) + '</b> bits/draw on average; if <b class="kd-cb">B</b>, ' +
        '<b class="kd-cb">−D(Q‖P) = −' + klQP.toFixed(2) + '</b>. ' +
        '<span class="kd-dim">KL is asymmetric, so these differ.</span>' +
        '<br>Expected draws to reach ±' + THRESHOLD + ' bits ≈ 5/KL ≈ <b>' +
        Math.round(THRESHOLD / klPQ) + '</b> (if A) / <b>' +
        Math.round(THRESHOLD / klQP) + '</b> (if B). Draw cap this round: ' + cap + '.' +
        '</div>';

      updateMeter(0);
      updateStatus();
    }

    function onDraw() {
      if (decided || drawBtn.disabled) return;   // cap / verdict reached
      var idx = sampleIndex(liveIsA ? P : Q, api.rng());
      var add = evidenceBits(P, Q, idx);   // log₂ P(x)/Q(x) of the actual symbol
      lambda += add;
      drawCount += 1;
      path.push(lambda);

      // Tape chip.
      var chip = elem('span', 'kd-chip ' + (add >= 0 ? 'kd-chip-a' : 'kd-chip-b'), GLYPHS[idx]);
      tape.appendChild(chip);
      // Keep tape from growing unbounded in long round 3.
      while (tape.childNodes.length > 60) tape.removeChild(tape.firstChild);
      tape.scrollLeft = tape.scrollWidth;

      api.sfx('tick');
      animateMeter(lambda, add);
      updateStatus();

      // Hit the safety cap: force a verdict prompt (player must still choose).
      if (drawCount >= cap) {
        drawBtn.disabled = true;
        delta.innerHTML = '<span class="kd-dim">Draw cap reached — make your accusation.</span>';
      }
    }

    function onAccuse(saysA) {
      if (decided) return;
      decided = true;
      drawBtn.disabled = true;
      accuseA.disabled = true;
      accuseB.disabled = true;

      var correct = (saysA === liveIsA);
      var sc = roundScore(correct, drawCount, ne, cap);
      totalScore += sc;
      totalDraws += drawCount;
      totalBench += ne;

      results.push({
        round: roundIdx + 1,
        truthA: liveIsA,
        saysA: saysA,
        correct: correct,
        draws: drawCount,
        ne: ne,
        score: sc,
        klTrue: klTrue
      });

      api.sfx(correct ? 'good' : 'bad');
      renderReveal(correct, saysA);
      updateStatus();
    }

    function nextRound() {
      roundIdx += 1;
      if (roundIdx >= ROUNDS.length) finish();
      else startRound();
    }

    /* ---- meter rendering ---- */
    function pct(v) { return clamp((v / METER_MAX) * 50 + 50, 0, 100); } // 0..100 across track

    function updateMeter(v) {
      var p = pct(v);
      needle.style.left = p + '%';
      meterVal.textContent = (v >= 0 ? '+' : '') + v.toFixed(2) + ' bits';
      meterVal.className = 'kd-meter-val ' + (v > 0.001 ? 'kd-toA' : (v < -0.001 ? 'kd-toB' : ''));
      // Fills grow from centre outward.
      var half = clamp((Math.abs(v) / METER_MAX) * 50, 0, 50);
      if (v >= 0) { fillPos.style.width = half + '%'; fillNeg.style.width = '0%'; }
      else { fillNeg.style.width = half + '%'; fillPos.style.width = '0%'; }
    }

    function animateMeter(v, add) {
      updateMeter(v);
      var dir = add >= 0 ? 'A' : 'B';
      var cls = add >= 0 ? 'kd-ca' : 'kd-cb';
      delta.innerHTML = '<span class="' + cls + '">' +
        (add >= 0 ? '+' : '') + add.toFixed(2) + ' bits toward ' + dir + '</span>';
      needle.classList.remove('kd-pulse');
      void needle.offsetWidth; // restart pulse animation
      needle.classList.add('kd-pulse');
    }

    /* ---- reveal: truth + SVG path ---- */
    function renderReveal(correct, saysA) {
      var truth = liveIsA ? 'Source A (P)' : 'Source B (Q)';
      var verdict = correct
        ? '<span class="kd-ok">✔ Correct.</span> The wire was ' + truth + '.'
        : '<span class="kd-no">✗ Wrong.</span> The wire was ' + truth + '.';
      reveal.innerHTML =
        '<div class="kd-reveal-head">' + verdict + '</div>' +
        '<div class="kd-reveal-meta">You called <b>' + (saysA ? 'A' : 'B') + '</b> after <b>' +
        drawCount + '</b> draw' + (drawCount === 1 ? '' : 's') +
        ' · benchmark ≈ ' + ne.toFixed(1) + ' (5 / D = ' + klTrue.toFixed(2) + ').' +
        ' Round score: ' + Math.round(results[results.length - 1].score * 100) + '%.</div>';
      reveal.appendChild(buildPathSvg(path));

      var btn = elem('button', 'btn btn-primary kd-next',
        roundIdx + 1 >= ROUNDS.length ? 'See debrief →' : 'Next round →');
      btn.addEventListener('click', nextRound);
      reveal.appendChild(btn);
      reveal.style.display = 'block';
    }

    function buildPathSvg(pts) {
      var W = 320, H = 110, padX = 6, padY = 8;
      var maxAbs = 1;
      for (var i = 0; i < pts.length; i++) maxAbs = Math.max(maxAbs, Math.abs(pts[i]));
      maxAbs = Math.max(maxAbs, THRESHOLD * 0.6);
      var n = pts.length;
      function px(i) { return padX + (n <= 1 ? 0 : (i / (n - 1)) * (W - 2 * padX)); }
      function py(v) { return H / 2 - (v / maxAbs) * (H / 2 - padY); }

      var svgNS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('class', 'kd-path');
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('width', '100%');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Evidence path over draws');

      var mid = document.createElementNS(svgNS, 'line');
      mid.setAttribute('x1', padX); mid.setAttribute('x2', W - padX);
      mid.setAttribute('y1', H / 2); mid.setAttribute('y2', H / 2);
      mid.setAttribute('class', 'kd-path-mid');
      svg.appendChild(mid);

      var d = '';
      for (var j = 0; j < n; j++) d += (j ? ' L ' : 'M ') + px(j).toFixed(1) + ' ' + py(pts[j]).toFixed(1);
      var line = document.createElementNS(svgNS, 'path');
      line.setAttribute('d', d);
      line.setAttribute('class', 'kd-path-line');
      svg.appendChild(line);

      var dot = document.createElementNS(svgNS, 'circle');
      dot.setAttribute('cx', px(n - 1)); dot.setAttribute('cy', py(pts[n - 1]));
      dot.setAttribute('r', '3.5');
      dot.setAttribute('class', pts[n - 1] >= 0 ? 'kd-dot-a' : 'kd-dot-b');
      svg.appendChild(dot);

      var lab = document.createElementNS(svgNS, 'text');
      lab.setAttribute('x', padX + 2); lab.setAttribute('y', 14);
      lab.setAttribute('class', 'kd-path-lab');
      lab.textContent = 'Λ over ' + (n - 1) + ' draws';
      svg.appendChild(lab);
      return svg;
    }

    /* ---- HUD + finish ---- */
    function updateStatus() {
      api.status('Round ' + (roundIdx + 1) + '/3 &nbsp;·&nbsp; draws ' + drawCount +
        ' &nbsp;·&nbsp; Λ ' + (lambda >= 0 ? '+' : '') + lambda.toFixed(2) + ' bits');
    }

    function finish() {
      var maxScore = ROUNDS.length;            // up to 1.0 per round
      var correctCount = 0;
      for (var i = 0; i < results.length; i++) if (results[i].correct) correctCount++;

      var allCorrect = correctCount === ROUNDS.length;
      var efficient = totalDraws <= 1.5 * totalBench;
      var stars;
      if (allCorrect && efficient) stars = 3;
      else if (allCorrect) stars = 2;
      else if (correctCount >= 2) stars = 1;
      else stars = 0;

      var bits = clamp(Math.round(50 * totalScore / maxScore), 0, 50);

      var headline = stars === 3 ? 'Imposter unmasked — clean sweep'
        : stars === 2 ? 'All three named, the patient way'
        : stars === 1 ? 'Mostly right; the wire fooled you once'
        : 'The imposter walked';

      api.complete({
        stars: stars,
        bits: bits,
        headline: headline,
        detailHTML: buildDetail(correctCount, allCorrect, efficient)
      });
    }

    function buildDetail(correctCount, allCorrect, efficient) {
      var rows = '';
      for (var i = 0; i < results.length; i++) {
        var r = results[i];
        rows +=
          '<tr>' +
          '<td>' + r.round + '</td>' +
          '<td>' + (r.truthA ? 'A' : 'B') + '</td>' +
          '<td>' + (r.saysA ? 'A' : 'B') +
            (r.correct ? ' <span class="kd-ok">✔</span>' : ' <span class="kd-no">✗</span>') + '</td>' +
          '<td>' + r.draws + ' / ' + r.ne.toFixed(1) + '</td>' +
          '<td>' + Math.round(r.score * 100) + '%</td>' +
          '</tr>';
      }
      return '' +
        '<p>You named <b>' + correctCount + '/3</b> sources correctly across ' +
        totalDraws + ' draws (benchmark ' + totalBench.toFixed(1) + ').</p>' +
        '<table><thead><tr><th>Rd</th><th>Truth</th><th>Your call</th>' +
        '<th>Draws / 5·KL⁻¹</th><th>Score</th></tr></thead><tbody>' + rows +
        '</tbody></table>' +
        '<p class="kd-lesson">Each sample carries, on average, exactly ' +
        '<b>D(P‖Q)</b> bits of evidence — KL is the currency of hypothesis ' +
        'testing. A wider divergence convicts in fewer draws ' +
        '(≈ threshold / KL), and because D(P‖Q) ≠ D(Q‖P) the wire can be ' +
        'quicker to expose one source than the other.</p>' +
        (allCorrect && !efficient
          ? '<p class="kd-dim">All correct — for the third star, decide closer to the ' +
            'benchmark instead of over-drawing.</p>'
          : '');
    }

    /* ---- teardown: clear every timer + document listener ---- */
    return {
      destroy: function () {
        for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
        timers.length = 0;
        if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
      }
    };

    /* ---- small DOM builders (closures over this run) ---- */
    function buildSourceColumn(letter, title, cls) {
      var col = elem('div', 'kd-card kd-source ' + cls);
      col.appendChild(elem('div', 'kd-source-title', title));
      var bars = elem('div', 'kd-bars');
      var rows = [];
      for (var i = 0; i < GLYPHS.length; i++) {
        var row = elem('div', 'kd-bar-row');
        row.appendChild(elem('span', 'kd-glyph', GLYPHS[i]));
        var barWrap = elem('div', 'kd-bar');
        var fill = elem('div', 'kd-bar-fill');
        barWrap.appendChild(fill);
        row.appendChild(barWrap);
        var pctLab = elem('span', 'kd-pct', '');
        row.appendChild(pctLab);
        bars.appendChild(row);
        rows.push({ fill: fill, pct: pctLab });
      }
      col.appendChild(bars);
      return { col: col, rows: rows };
    }

    function renderBars(column, dist) {
      var maxP = 0;
      for (var i = 0; i < dist.length; i++) maxP = Math.max(maxP, dist[i]);
      for (var j = 0; j < dist.length; j++) {
        column.rows[j].fill.style.width = ((dist[j] / maxP) * 100).toFixed(1) + '%';
        column.rows[j].pct.textContent = Math.round(dist[j] * 100) + '%';
      }
    }
  }
});

/* ===================== plain DOM helper (no innerHTML for text) ===================== */
function elem(tag, cls, html) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

/* ===================== styles (injected once) ===================== */
var STYLE = '' +
'.kd-wrap{display:flex;flex-direction:column;gap:0.9rem;}' +
'.kd-card{background:var(--surface);border:1px solid var(--surface2);border-radius:12px;padding:0.9rem 1rem;}' +
'.kd-dim{color:var(--dim);}' +
'.kd-ca{color:var(--blue);}' +
'.kd-cb{color:var(--orange);}' +

/* prediction */
'.kd-predict-head{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.18em;color:var(--muted);margin-bottom:0.4rem;}' +
'.kd-predict-body{font-size:0.86rem;line-height:1.6;color:var(--text);}' +

/* source columns */
'.kd-sources{display:grid;grid-template-columns:1fr 1fr;gap:0.9rem;}' +
'.kd-source-title{font-size:0.82rem;font-weight:600;margin-bottom:0.6rem;letter-spacing:0.04em;}' +
'.kd-a .kd-source-title{color:var(--blue);}' +
'.kd-b .kd-source-title{color:var(--orange);}' +
'.kd-bars{display:flex;flex-direction:column;gap:0.4rem;}' +
'.kd-bar-row{display:flex;align-items:center;gap:0.5rem;}' +
'.kd-glyph{width:1.2rem;text-align:center;font-size:1.05rem;color:var(--text);flex:none;}' +
'.kd-bar{flex:1;height:14px;background:var(--surface2);border-radius:4px;overflow:hidden;}' +
'.kd-bar-fill{height:100%;border-radius:4px;transition:width 0.3s;}' +
'.kd-a .kd-bar-fill{background:var(--blue);}' +
'.kd-b .kd-bar-fill{background:var(--orange);}' +
'.kd-pct{width:2.6rem;text-align:right;font-size:0.74rem;color:var(--muted);flex:none;font-variant-numeric:tabular-nums;}' +

/* meter */
'.kd-meter-card{text-align:center;}' +
'.kd-meter-label{font-size:0.78rem;color:var(--muted);margin-bottom:0.3rem;}' +
'.kd-meter-val{font-size:1.7rem;font-weight:700;font-variant-numeric:tabular-nums;margin-bottom:0.5rem;color:var(--text);}' +
'.kd-meter-val.kd-toA{color:var(--blue);}' +
'.kd-meter-val.kd-toB{color:var(--orange);}' +
'.kd-track{position:relative;height:26px;background:var(--bg);border:1px solid var(--surface2);border-radius:13px;overflow:hidden;margin:0 auto;}' +
'.kd-track-mid{position:absolute;left:50%;top:0;bottom:0;width:2px;margin-left:-1px;background:var(--border);z-index:1;}' +
'.kd-fill{position:absolute;top:0;bottom:0;opacity:0.32;transition:width 0.25s;}' +
'.kd-fill-pos{left:50%;background:var(--blue);}' +
'.kd-fill-neg{right:50%;background:var(--orange);}' +
'.kd-needle{position:absolute;top:-3px;bottom:-3px;width:4px;margin-left:-2px;background:var(--text);border-radius:2px;left:50%;transition:left 0.28s cubic-bezier(.4,1.3,.5,1);z-index:2;box-shadow:0 0 6px rgba(226,232,240,0.6);}' +
'.kd-needle.kd-pulse{animation:kd-pulse 0.3s ease;}' +
'@keyframes kd-pulse{0%{transform:scaleY(1.4);}100%{transform:scaleY(1);}}' +
'.kd-ends{display:flex;justify-content:space-between;font-size:0.7rem;margin-top:0.35rem;}' +
'.kd-end-b{color:var(--orange);}' +
'.kd-end-a{color:var(--blue);}' +
'.kd-delta{margin-top:0.5rem;font-size:0.9rem;font-weight:600;min-height:1.2rem;font-variant-numeric:tabular-nums;}' +

/* tape */
'.kd-tape-label{font-size:0.72rem;text-transform:uppercase;letter-spacing:0.16em;color:var(--muted);margin-bottom:0.4rem;}' +
'.kd-tape{display:flex;gap:0.25rem;overflow-x:auto;padding:0.2rem;min-height:2.2rem;align-items:center;background:var(--bg);border-radius:8px;}' +
'.kd-chip{flex:none;width:1.8rem;height:1.8rem;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:1rem;background:var(--surface2);}' +
'.kd-chip-a{color:var(--blue);box-shadow:inset 0 0 0 1px var(--blue);}' +
'.kd-chip-b{color:var(--orange);box-shadow:inset 0 0 0 1px var(--orange);}' +

/* controls */
'.kd-controls{display:flex;gap:0.7rem;flex-wrap:wrap;}' +
'.kd-btn{flex:1;min-width:120px;min-height:44px;display:flex;align-items:center;justify-content:center;gap:0.5rem;}' +
'.kd-accuse-a{border-color:var(--blue);color:var(--blue);}' +
'.kd-accuse-a:hover:not(:disabled){background:rgba(56,189,248,0.12);color:var(--blue);border-color:var(--blue);}' +
'.kd-accuse-b{border-color:var(--orange);color:var(--orange);}' +
'.kd-accuse-b:hover:not(:disabled){background:rgba(251,146,60,0.12);color:var(--orange);border-color:var(--orange);}' +
'.kd-key{display:inline-block;font-size:0.62rem;padding:0.05rem 0.35rem;border:1px solid currentColor;border-radius:4px;opacity:0.7;}' +

/* reveal */
'.kd-reveal-head{font-size:1rem;font-weight:600;margin-bottom:0.4rem;}' +
'.kd-reveal-meta{font-size:0.84rem;color:var(--muted);line-height:1.55;margin-bottom:0.7rem;}' +
'.kd-ok{color:var(--green);}' +
'.kd-no{color:var(--red);}' +
'.kd-path{display:block;background:var(--bg);border-radius:8px;border:1px solid var(--surface2);margin-bottom:0.8rem;}' +
'.kd-path-mid{stroke:var(--border);stroke-width:1;stroke-dasharray:3 3;}' +
'.kd-path-line{fill:none;stroke:var(--cyan);stroke-width:2;stroke-linejoin:round;stroke-linecap:round;}' +
'.kd-path-lab{fill:var(--dim);font-size:9px;font-family:ui-monospace,Consolas,monospace;}' +
'.kd-dot-a{fill:var(--blue);}' +
'.kd-dot-b{fill:var(--orange);}' +
'.kd-next{min-height:44px;}' +
'.kd-lesson{margin-top:0.6rem;}' +

'@media (max-width:520px){' +
'.kd-sources{grid-template-columns:1fr;}' +
'.kd-meter-val{font-size:1.4rem;}' +
'.kd-btn{min-width:100%;}' +
'}';

})();
