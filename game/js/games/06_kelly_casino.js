/* SIGNAL LOST — 06 · The Growth Game (kelly-casino)
   Kelly betting: the doubling rate W(f) = p log2(1+f) + (1-p) log2(1-f),
   maxed at f* = 2p-1 with W* = 1 - H2(p). Side information is worth I(X;Y).
   Contract: ../DESIGN.md. No canvas — DOM + inline SVG only. */
(function () {
'use strict';

/* ---------------- pure math (no DOM, unit-testable) ---------------- */

function log2(x) { return Math.log(x) / Math.LN2; }

function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

// Binary entropy H2(p) in bits. Endpoints -> 0.
function h2(p) {
  if (p <= 0 || p >= 1) return 0;
  return -p * log2(p) - (1 - p) * log2(1 - p);
}

// Kelly-optimal fraction for an even-money bet at win prob p: f* = 2p - 1.
// Clamped to [0,1] — no shorting (a negative f* means "don't bet", f=0).
function fStar(p) { return clamp(2 * p - 1, 0, 1); }

// Doubling rate (growth per flip, bits) of staking fraction f at win prob p.
// W(f,p) = p log2(1+f) + (1-p) log2(1-f). Guards f>=1 (total ruin term).
function growthW(f, p) {
  if (f <= 0) return 0;
  if (f >= 1) return -Infinity;
  return p * log2(1 + f) + (1 - p) * log2(1 - f);
}

// Max attainable growth rate: W* = W(f*, p) = 1 - H2(p).
function wmax(p) { return 1 - h2(p); }

// Quantize a slider fraction to the 0..0.95 / 0.05 grid (defensive rounding).
function snapF(f) { return clamp(Math.round(f / 0.05) * 0.05, 0, 0.95); }

/* ---------------- stage definitions (data only) ----------------
   Effective win prob is what the math sees. For stages 1 & 2 it equals the
   shown coin bias. Stage 3 is a fair coin (p=0.5) but a tip correct with
   prob 0.8 makes the effective win prob 0.8 when you bet WITH the tip, 0.2
   when you bet AGAINST it. f* and W* are always computed from pEff. */

var STAGES = [
  {
    key: 'house',
    name: 'The House Coin',
    coinP: 0.75, flips: 25, pEff: 0.75, tipped: false,
    blurb: 'The grid pays even money on a coin that lands heads three times in four — and it tells you so, openly. Stake your edge.',
    lesson: 'Bet your edge: f* = 2p − 1. Here p = 0.75, so f* = 0.50.',
  },
  {
    key: 'tempter',
    name: 'The Tempter',
    coinP: 0.55, flips: 20, pEff: 0.55, tipped: false,
    blurb: 'A thinner coin: heads 55% of the time. The edge is real but tiny. Over-bet and volatility eats you alive.',
    lesson: 'A tiny edge means a tiny stake: f* = 0.10. Bet above ~0.20 and W(f) goes NEGATIVE — you grow broke in expectation.',
  },
  {
    key: 'tip',
    name: 'The Tip Line',
    coinP: 0.5, flips: 15, pEff: 0.8, tipAccuracy: 0.8, tipped: true,
    blurb: 'The coin is dead fair — no edge at all. But an informant whispers each outcome first, right four times in five. The whisper is the edge.',
    lesson: 'Side information is worth exactly I(X;Y) = 1 − H₂(0.8) ≈ 0.278 bits/flip. Bet WITH the tip (effective p = 0.80, f* = 0.60). Information has a price in credits.',
  },
];

var START_BANK = 100;
var BUST_FLOOR = 1; // bankroll < this credit -> BUSTED (stage 2)

/* ---------------- DOM helpers ---------------- */

function mk(tag, cls, html) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

var SVGNS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs) {
  var n = document.createElementNS(SVGNS, tag);
  if (attrs) for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
  return n;
}

/* ---------------- registration ---------------- */

Game.register({
  id: 'kelly-casino',
  title: 'The Growth Game',
  icon: '🎰',
  part: 6,
  module: '6A',
  moduleTitle: 'Cross-Entropy, MaxEnt & Kelly',
  moduleUrl: '../6a_crossentropy_maxent/',
  tagline: 'Bet a crooked coin without going broke — entropy is your growth rate.',

  briefing:
    '<p>The station runs on reserve power, and the grid pays even money on a ' +
    'crooked coin. Your bankroll <em>is</em> the reserve: each flip you stake a ' +
    'fraction of it — win and it swells by that fraction, lose and it shrinks. ' +
    'Bet too small and you crawl; bet too big and a streak of bad luck ruins you. ' +
    'Somewhere between is the rate that compounds fastest.</p>' +
    '<ul>' +
    '<li>Set your stake <b>fraction f</b> with the slider (0 to 0.95), adjustable between flips.</li>' +
    '<li>Press <b>Flip</b> or <b>Flip ×5</b> to wager — the bankroll chart is log-scaled, the honest scale for growth.</li>' +
    '<li>Watch your realized growth rate <b>g</b> against the optimum <b>W*</b> for the stage.</li>' +
    '<li>Three stages: an open edge, a tempting thin one, and a fair coin with an informant.</li>' +
    '</ul>',

  concept:
    '<p>Staking a fixed fraction f of your bankroll on an even-money bet (win ' +
    'prob p) grows wealth at the <b>doubling rate</b> ' +
    'W(f) = p·log₂(1+f) + (1−p)·log₂(1−f) bits per flip. It is maximized at the ' +
    '<b>Kelly fraction f* = 2p − 1</b>, where the rate hits ' +
    '<b>W* = 1 − H₂(p)</b> — the same gap that entropy measures.</p>' +
    '<p>Side information that pins the outcome with accuracy a raises the achievable ' +
    'rate by exactly the mutual information <b>I(X;Y) = 1 − H₂(a)</b> bits/flip: the ' +
    'tip is worth its information content in growth. And betting on the <em>wrong</em> ' +
    'beliefs q instead of the true p costs you <b>D(p‖q)</b> bits of growth every flip — ' +
    'relative entropy is the price of a bad model.</p>',

  create: function (root, api) {
    /* ---- ALL mutable state lives here; create() is the full reset ---- */
    var rng = api.rng;

    var stageIdx = 0;
    var bank = START_BANK;
    var flipsDone = 0;          // flips made in current stage
    var curStage = STAGES[0];
    var betWithTip = true;      // stage 3 direction toggle (true = with the tip)
    var fSel = 0;               // current slider fraction
    var stageActive = true;     // false while between stages / finished
    var finished = false;

    // per-flip history of THIS stage: { f, won, bankAfter }
    var history = [];
    // bankroll trace for the chart (this stage), starts at START_BANK
    var trace = [START_BANK];
    // accumulators across stages
    var stageResults = [];      // one record per finished stage (see endStage)
    var sumF = 0, nF = 0;       // running avg-f for status line

    var timers = [];
    function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    api.injectStyle(
      '.kc-wrap{display:flex;flex-direction:column;gap:0.9rem;}' +
      '.kc-head{display:flex;justify-content:space-between;align-items:baseline;gap:0.6rem;flex-wrap:wrap;}' +
      '.kc-sname{font-weight:700;font-size:1.05rem;}' +
      '.kc-snum{font-size:0.7rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);}' +
      '.kc-blurb{font-size:0.84rem;color:var(--muted);line-height:1.55;}' +
      '.kc-coin{font-size:0.82rem;color:var(--text);}' +
      '.kc-coin b{color:var(--cyan);}' +
      '.kc-readout{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:0.6rem;}' +
      '.kc-stat{background:var(--bg);border:1px solid var(--surface2);border-radius:10px;padding:0.6rem 0.7rem;}' +
      '.kc-stat .kc-k{font-size:0.64rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--dim);}' +
      '.kc-stat .kc-v{font-size:1.3rem;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.25;}' +
      '.kc-stat .kc-sub{font-size:0.68rem;color:var(--muted);}' +
      '.kc-chart{background:var(--bg);border:1px solid var(--surface2);border-radius:10px;padding:0.5rem;}' +
      '.kc-chart svg{display:block;width:100%;height:auto;}' +
      '.kc-axis{font-size:9px;fill:var(--dim);font-family:ui-monospace,Consolas,monospace;}' +
      '.kc-gridline{stroke:var(--surface2);stroke-width:1;}' +
      '.kc-line{fill:none;stroke:var(--green);stroke-width:2;stroke-linejoin:round;}' +
      '.kc-line.kc-down{stroke:var(--red);}' +
      '.kc-startline{stroke:var(--dim);stroke-width:1;stroke-dasharray:3 3;}' +
      '.kc-controls{display:flex;flex-direction:column;gap:0.7rem;}' +
      '.kc-slider-row{display:flex;align-items:center;gap:0.7rem;flex-wrap:wrap;}' +
      '.kc-slider-row label{font-size:0.78rem;color:var(--muted);min-width:8.5rem;}' +
      '.kc-slider{flex:1;min-width:140px;height:40px;cursor:pointer;accent-color:var(--cyan);}' +
      '.kc-fval{font-variant-numeric:tabular-nums;font-weight:700;font-size:1.05rem;min-width:3.2rem;text-align:right;}' +
      '.kc-wnow{font-size:0.74rem;color:var(--muted);font-variant-numeric:tabular-nums;}' +
      '.kc-wnow b.kc-pos{color:var(--green);}' +
      '.kc-wnow b.kc-neg{color:var(--red);}' +
      '.kc-buttons{display:flex;gap:0.7rem;flex-wrap:wrap;}' +
      '.kc-buttons .btn{min-height:44px;flex:1;min-width:120px;}' +
      '.kc-toggle{display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;}' +
      '.kc-toggle .btn{min-height:40px;padding:0.4rem 0.9rem;}' +
      '.kc-toggle .btn.kc-on{border-color:var(--cyan);color:var(--cyan);box-shadow:0 0 0 1px var(--cyan) inset;}' +
      '.kc-tip{font-size:0.85rem;padding:0.5rem 0.7rem;border-radius:8px;border:1px solid var(--surface2);' +
        'background:var(--surface);min-height:1.2em;}' +
      '.kc-tip .kc-tval{font-weight:700;}' +
      '.kc-tip .kc-h{color:var(--red);}' +
      '.kc-tip .kc-t{color:var(--green);}' +
      '.kc-goad{font-size:0.82rem;color:var(--orange);font-style:italic;min-height:1.1em;line-height:1.4;}' +
      '.kc-msg{font-size:0.85rem;color:var(--muted);min-height:1.2em;line-height:1.4;}' +
      '.kc-msg b.kc-yes{color:var(--green);}' +
      '.kc-msg b.kc-no{color:var(--red);}' +
      '.kc-bust{color:var(--red);font-weight:700;}' +
      '.kc-reveal{background:var(--bg);border:1px solid var(--surface2);border-left:3px solid var(--cyan);' +
        'border-radius:8px;padding:0.8rem 0.9rem;display:flex;flex-direction:column;gap:0.6rem;}' +
      '.kc-reveal h3{font-size:0.95rem;color:var(--cyan);}' +
      '.kc-reveal p{font-size:0.84rem;line-height:1.55;color:var(--text);}' +
      '.kc-curve svg{display:block;width:100%;height:auto;}' +
      '.kc-cv-line{fill:none;stroke:var(--blue);stroke-width:2;}' +
      '.kc-cv-zero{stroke:var(--surface2);stroke-width:1;}' +
      '.kc-cv-star{stroke:var(--green);stroke-width:1.5;stroke-dasharray:4 3;}' +
      '.kc-cv-pick{fill:var(--yellow);}' +
      '.kc-cv-fstar{fill:var(--green);}' +
      '.kc-cv-lbl{font-size:9px;fill:var(--muted);font-family:ui-monospace,Consolas,monospace;}' +
      '.kc-next{min-height:44px;}' +
      '@media (max-width:420px){.kc-slider-row label{min-width:100%;}.kc-fval{min-width:2.6rem;}}'
    );

    /* ---- DOM scaffold ---- */
    var wrap = mk('div', 'kc-wrap');

    var head = mk('div', 'kc-head');
    var sname = mk('div', 'kc-sname');
    var snum = mk('div', 'kc-snum');
    head.appendChild(sname);
    head.appendChild(snum);
    wrap.appendChild(head);

    var blurb = mk('div', 'kc-blurb');
    wrap.appendChild(blurb);
    var coinLine = mk('div', 'kc-coin');
    wrap.appendChild(coinLine);

    // live readout: bankroll, g realized, W*
    var readout = mk('div', 'kc-readout');
    var stBank = makeStat('bankroll');
    var stG = makeStat('realized g (bits/flip)');
    var stW = makeStat('optimum W*');
    readout.appendChild(stBank.box);
    readout.appendChild(stG.box);
    readout.appendChild(stW.box);
    wrap.appendChild(readout);

    // log-scale bankroll chart
    var chartBox = mk('div', 'kc-chart');
    wrap.appendChild(chartBox);

    // tip line (stage 3 only)
    var tipBox = mk('div', 'kc-tip');
    tipBox.style.display = 'none';
    wrap.appendChild(tipBox);

    // controls
    var controls = mk('div', 'kc-controls');

    // direction toggle (stage 3 only)
    var toggleRow = mk('div', 'kc-toggle');
    toggleRow.style.display = 'none';
    var btnWith = mk('button', 'btn kc-on', 'Bet WITH the tip');
    var btnAgainst = mk('button', 'btn', 'Bet AGAINST');
    toggleRow.appendChild(mk('span', null, 'Direction:'));
    toggleRow.appendChild(btnWith);
    toggleRow.appendChild(btnAgainst);
    controls.appendChild(toggleRow);

    var sliderRow = mk('div', 'kc-slider-row');
    var sliderLabel = mk('label', null, 'Stake fraction f');
    var slider = mk('input', 'kc-slider');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '0.95';
    slider.step = '0.05';
    slider.value = '0';
    var fval = mk('span', 'kc-fval', '0.00');
    sliderRow.appendChild(sliderLabel);
    sliderRow.appendChild(slider);
    sliderRow.appendChild(fval);
    controls.appendChild(sliderRow);

    var wnow = mk('div', 'kc-wnow');
    controls.appendChild(wnow);

    var goad = mk('div', 'kc-goad');
    controls.appendChild(goad);

    var buttons = mk('div', 'kc-buttons');
    var flip1 = mk('button', 'btn btn-primary', 'Flip');
    var flip5 = mk('button', 'btn', 'Flip ×5');
    buttons.appendChild(flip1);
    buttons.appendChild(flip5);
    controls.appendChild(buttons);

    var msg = mk('div', 'kc-msg', '');
    controls.appendChild(msg);

    wrap.appendChild(controls);

    // stage reveal panel (shown between stages)
    var revealBox = mk('div', 'kc-reveal');
    revealBox.style.display = 'none';
    wrap.appendChild(revealBox);

    root.replaceChildren(wrap);

    function makeStat(k) {
      var box = mk('div', 'kc-stat');
      box.appendChild(mk('div', 'kc-k', k));
      var v = mk('div', 'kc-v', '—');
      box.appendChild(v);
      var s = mk('div', 'kc-sub', '');
      box.appendChild(s);
      return { box: box, v: v, sub: s };
    }

    /* ---- effective win prob given direction (stage 3) ---- */
    function effP() {
      if (!curStage.tipped) return curStage.pEff;
      // betting WITH the tip: you win when the tip is right (prob = accuracy);
      // betting AGAINST: you win when the tip is wrong (prob = 1 - accuracy).
      return betWithTip ? curStage.tipAccuracy : (1 - curStage.tipAccuracy);
    }

    /* ---- current pending tip (the outcome the informant points at) ---- */
    var pendingTip = null; // 'H' or 'T' for the NEXT flip (stage 3)

    function rollTip() {
      // The informant points at a side; it's the TRUE side with prob accuracy.
      // We pre-commit the true outcome here too, so betting-with has win prob a.
      pendingTip = rng() < 0.5 ? 'H' : 'T';
    }

    function renderTip() {
      if (!curStage.tipped) { tipBox.style.display = 'none'; return; }
      tipBox.style.display = '';
      var side = pendingTip === 'H' ? 'HEADS' : 'TAILS';
      var cls = pendingTip === 'H' ? 'kc-h' : 'kc-t';
      tipBox.innerHTML = '📨 Informant: next flip is <span class="kc-tval ' + cls + '">' + side +
        '</span> &middot; <span style="color:var(--dim)">trusted ' +
        (curStage.tipAccuracy * 100).toFixed(0) + '% of the time</span>';
    }

    /* ---- load a stage (reset per-stage state) ---- */
    function loadStage() {
      curStage = STAGES[stageIdx];
      bank = START_BANK;
      flipsDone = 0;
      history = [];
      trace = [START_BANK];
      stageActive = true;
      revealBox.style.display = 'none';
      controls.style.display = '';

      sname.textContent = curStage.name;
      snum.textContent = 'Stage ' + (stageIdx + 1) + ' / ' + STAGES.length;
      blurb.textContent = curStage.blurb;

      var fs = fStar(curStage.pEff);
      coinLine.innerHTML = curStage.tipped
        ? 'Coin: <b>fair</b> (p = 0.50, no edge). With the tip, effective p = <b>' +
          curStage.tipAccuracy.toFixed(2) + '</b> → f* = <b>' + fStar(curStage.tipAccuracy).toFixed(2) +
          '</b>, W* ≈ <b>' + wmax(curStage.tipAccuracy).toFixed(3) + '</b> bits/flip.'
        : 'Coin: heads with p = <b>' + curStage.coinP.toFixed(2) + '</b> (shown). ' +
          'f* = <b>' + fs.toFixed(2) + '</b>, W* ≈ <b>' + wmax(curStage.pEff).toFixed(3) + '</b> bits/flip.';

      // toggle visibility for stage 3
      if (curStage.tipped) {
        toggleRow.style.display = '';
        betWithTip = true;
        setToggle();
        rollTip();
        renderTip();
      } else {
        toggleRow.style.display = 'none';
        tipBox.style.display = 'none';
        pendingTip = null;
      }

      // reset slider toward something sensible but let the player choose
      fSel = 0;
      slider.value = '0';
      fval.textContent = '0.00';

      goad.textContent = '';
      setMsg(curStage.tipped
        ? 'Pick a direction and a stake, then flip. The coin is fair — your only edge is the whisper.'
        : 'Choose your stake fraction, then flip.');
      enableInput(true);
      render();
      pushStatus();
    }

    /* ---- realized growth rate g = log2(W/W0)/n ---- */
    function realizedG() {
      if (flipsDone <= 0) return 0;
      if (bank <= 0) return -Infinity;
      return log2(bank / START_BANK) / flipsDone;
    }

    function setToggle() {
      if (betWithTip) {
        btnWith.classList.add('kc-on');
        btnAgainst.classList.remove('kc-on');
      } else {
        btnAgainst.classList.add('kc-on');
        btnWith.classList.remove('kc-on');
      }
    }

    function setMsg(html) { msg.innerHTML = html; }

    function enableInput(on) {
      slider.disabled = !on;
      flip1.disabled = !on;
      flip5.disabled = !on;
      btnWith.disabled = !on;
      btnAgainst.disabled = !on;
    }

    /* ---- render readout + chart + W(f) hint ---- */
    function render() {
      var p = effP();
      var fs = fStar(p);
      var ws = wmax(p);

      stBank.v.textContent = bank.toFixed(2);
      stBank.v.style.color = bank >= START_BANK ? 'var(--green)' : 'var(--red)';
      stBank.sub.textContent = 'started at ' + START_BANK + ' · flip ' +
        Math.min(flipsDone, curStage.flips) + '/' + curStage.flips;

      var g = realizedG();
      stG.v.textContent = flipsDone > 0 ? (g === -Infinity ? '−∞' : g.toFixed(3)) : '—';
      stG.v.style.color = flipsDone > 0 && g >= 0 ? 'var(--green)' : (flipsDone > 0 ? 'var(--red)' : 'var(--text)');
      stG.sub.textContent = 'realized, noisy';

      stW.v.textContent = ws.toFixed(3);
      stW.v.style.color = 'var(--cyan)';
      stW.sub.textContent = 'at f* = ' + fs.toFixed(2);

      // live W(f) for the currently-selected fraction
      var wf = growthW(fSel, p);
      var sign = wf >= 0 ? 'kc-pos' : 'kc-neg';
      wnow.innerHTML = 'At f = ' + fSel.toFixed(2) + ', expected growth W(f) = <b class="' + sign + '">' +
        (wf === -Infinity ? '−∞' : wf.toFixed(3)) + '</b> bits/flip' +
        (Math.abs(fSel - fs) < 0.001 ? ' &nbsp;(this is f*)' : '') +
        (wf < 0 ? ' &nbsp;— losing ground!' : '');

      renderChart();
    }

    /* ---- log-scale bankroll chart (inline SVG polyline) ---- */
    function renderChart() {
      chartBox.replaceChildren();
      var W = 600, H = 150, padL = 40, padR = 10, padT = 12, padB = 18;
      var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
        'aria-label': 'Bankroll over flips, log scale' });

      // y-axis on log10(bankroll). Range from min to max of trace, clamped.
      var lo = Infinity, hi = -Infinity, i;
      for (i = 0; i < trace.length; i++) {
        var v = Math.max(trace[i], 0.01);
        var l = Math.log(v) / Math.LN10;
        if (l < lo) lo = l;
        if (l > hi) hi = l;
      }
      // always include the start line (log10(100) = 2) in view
      var startL = Math.log(START_BANK) / Math.LN10;
      lo = Math.min(lo, startL);
      hi = Math.max(hi, startL);
      if (hi - lo < 0.4) { var mid = (hi + lo) / 2; lo = mid - 0.2; hi = mid + 0.2; }
      var span = hi - lo;

      var plotW = W - padL - padR, plotH = H - padT - padB;
      var n = Math.max(curStage.flips, 1);

      function xAt(idx) { return padL + (plotW * idx) / n; }
      function yAt(val) {
        var l = Math.log(Math.max(val, 0.01)) / Math.LN10;
        return padT + plotH * (1 - (l - lo) / span);
      }

      // gridlines + labels at a few decades / ticks
      var ticks = niceLogTicks(lo, hi);
      for (i = 0; i < ticks.length; i++) {
        var ty = yAt(ticks[i]);
        s.appendChild(svg('line', { x1: padL, y1: ty, x2: W - padR, y2: ty, 'class': 'kc-gridline' }));
        var lab = svg('text', { x: 4, y: ty + 3, 'class': 'kc-axis' });
        lab.textContent = fmtCredits(ticks[i]);
        s.appendChild(lab);
      }
      // y-axis title
      var yt = svg('text', { x: 4, y: padT - 3, 'class': 'kc-axis' });
      yt.textContent = 'credits (log)';
      s.appendChild(yt);

      // start reference line
      s.appendChild(svg('line', { x1: padL, y1: yAt(START_BANK), x2: W - padR, y2: yAt(START_BANK),
        'class': 'kc-startline' }));

      // polyline of the bankroll trace
      var pts = '';
      for (i = 0; i < trace.length; i++) pts += (i ? ' ' : '') + xAt(i).toFixed(1) + ',' + yAt(trace[i]).toFixed(1);
      var lineCls = 'kc-line' + (trace.length > 1 && trace[trace.length - 1] < trace[0] ? ' kc-down' : '');
      s.appendChild(svg('polyline', { points: pts, 'class': lineCls }));

      // x-axis label
      var xt = svg('text', { x: W - padR, y: H - 4, 'class': 'kc-axis', 'text-anchor': 'end' });
      xt.textContent = 'flips →';
      s.appendChild(xt);

      chartBox.appendChild(s);
    }

    // pick ~3-4 round-ish log tick values across [lo,hi] (log10 space)
    function niceLogTicks(lo, hi) {
      var out = [];
      var loD = Math.floor(lo), hiD = Math.ceil(hi);
      for (var d = loD; d <= hiD; d++) {
        var base = Math.pow(10, d);
        // include 1x and 3x of each decade if in range, cap the count
        [1, 3].forEach(function (m) {
          var v = base * m;
          var lv = Math.log(v) / Math.LN10;
          if (lv >= lo - 1e-9 && lv <= hi + 1e-9) out.push(v);
        });
      }
      if (out.length > 6) {
        // thin to every other
        out = out.filter(function (_, k) { return k % 2 === 0; });
      }
      if (!out.length) out.push(Math.pow(10, (lo + hi) / 2));
      return out;
    }

    function fmtCredits(v) {
      if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + 'M';
      if (v >= 1e3) return (v / 1e3).toFixed(v >= 1e4 ? 0 : 1) + 'k';
      if (v >= 10) return v.toFixed(0);
      if (v >= 1) return v.toFixed(1);
      return v.toFixed(2);
    }

    /* ---- the tempter's personality: goad after win streaks ---- */
    function updateGoad() {
      if (curStage.key !== 'tempter') { goad.textContent = ''; return; }
      // count trailing wins
      var streak = 0;
      for (var i = history.length - 1; i >= 0; i--) {
        if (history[i].won) streak++; else break;
      }
      if (streak >= 3) {
        goad.textContent = '🎲 "You\'re on FIRE. Push it — slide that all the way up. What are you, scared?"';
      } else if (streak === 2) {
        goad.textContent = '🎲 "Two in a row. The coin loves you tonight. Bet bigger."';
      } else {
        goad.textContent = '';
      }
    }

    /* ---- one flip ---- */
    function doFlip() {
      if (!stageActive || finished) return;
      if (flipsDone >= curStage.flips) return;

      var f = snapF(fSel);
      var p = effP();

      var won;
      if (curStage.tipped) {
        // The tip points at pendingTip and is correct with prob accuracy.
        // tipCorrect ~ Bernoulli(accuracy). Betting WITH the tip wins iff
        // the tip was correct; AGAINST wins iff the tip was wrong.
        var tipCorrect = rng() < curStage.tipAccuracy;
        won = betWithTip ? tipCorrect : !tipCorrect;
      } else {
        won = rng() < p;
      }

      bank = won ? bank * (1 + f) : bank * (1 - f);
      flipsDone++;
      history.push({ f: f, won: won, bankAfter: bank });
      trace.push(bank);
      sumF += f; nF++;

      api.sfx(won ? 'good' : 'bad');

      // roll the next tip for stage 3
      if (curStage.tipped && flipsDone < curStage.flips) { rollTip(); }

      // bust check (stage 2 — but applies wherever bank dips below the floor)
      if (bank < BUST_FLOOR) {
        flipResultMsg(won, f, true);
        bustStage();
        return;
      }

      flipResultMsg(won, f, false);
      updateGoad();
      renderTip();
      render();
      pushStatus();

      if (flipsDone >= curStage.flips) {
        endStage(false);
      }
    }

    function flipResultMsg(won, f, busting) {
      if (busting) {
        setMsg('Flip ' + flipsDone + ': <b class="kc-no">LOSE</b> at f = ' + f.toFixed(2) +
          '. Bankroll fell to ' + bank.toFixed(2) + ' credits. <span class="kc-bust">BUSTED.</span>');
        return;
      }
      setMsg('Flip ' + flipsDone + ': <b class="' + (won ? 'kc-yes">WIN' : 'kc-no">LOSE') +
        '</b> at f = ' + f.toFixed(2) + ' → bankroll ' + bank.toFixed(2) + ' credits.');
    }

    /* ---- flip x5 (with small stagger for feel; finishable instantly) ---- */
    function doFlip5() {
      if (!stageActive || finished) return;
      // do the flips synchronously (deterministic, always finishable), then
      // a tiny animation tick of the chart already happens in doFlip's render.
      var remaining = 5;
      function step() {
        if (!stageActive || finished) return;
        if (remaining <= 0) return;
        if (flipsDone >= curStage.flips) return;
        doFlip();
        remaining--;
        if (remaining > 0 && stageActive && !finished && flipsDone < curStage.flips) {
          later(step, 90);
        }
      }
      step();
    }

    /* ---- bust: end stage immediately with r=0 ---- */
    function bustStage() {
      if (!stageActive) return;
      stageActive = false;
      enableInput(false);
      api.sfx('lose');
      recordStage(true);
      showReveal(true);
    }

    /* ---- normal stage end ---- */
    function endStage() {
      if (!stageActive) return;
      stageActive = false;
      enableInput(false);
      api.sfx('win');
      recordStage(false);
      showReveal(false);
    }

    /* ---- compute & store this stage's scoring record ----
       SCORING CHOICE: we score on EXPECTED growth from the player's chosen
       fractions — sum of W(f_i, pEff) — against the optimum (W* × flips).
       Realized wealth is noisy; expected W(f_chosen) is the fair, low-variance
       measure of decision quality. Realized g still drives the chart & bust. */
    function recordStage(busted) {
      var p = curStage.pEff;          // the "true" effective prob for scoring
      var ws = wmax(p);               // per-flip optimum
      var flips = curStage.flips;
      var optTotal = ws * flips;

      var avgF = 0, expTotal = 0;
      if (history.length) {
        var sf = 0;
        for (var i = 0; i < history.length; i++) {
          var f = history[i].f;
          sf += f;
          // for stage 3 we credit growth at the EFFECTIVE prob the player's
          // direction earned: with-tip -> accuracy, against -> 1-accuracy.
          var pEffForBet = curStage.tipped
            ? (betWithTip ? curStage.tipAccuracy : (1 - curStage.tipAccuracy))
            : p;
          var w = growthW(f, pEffForBet);
          if (w === -Infinity) w = -3; // floor a ruinous bet for scoring sanity
          expTotal += w;
        }
        avgF = sf / history.length;
      }

      // ratio of achieved expected growth to the optimum, clipped to [0,1].
      // Note expTotal is over flips ACTUALLY made; normalize by the optimum
      // over the FULL stage so quitting early (bust) is penalized.
      var r;
      if (busted) {
        r = 0;
      } else {
        r = optTotal > 0 ? clamp(expTotal / optTotal, 0, 1) : 0;
      }

      var realG = realizedG();
      stageResults.push({
        name: curStage.name,
        flips: flips,
        flipsMade: history.length,
        avgF: avgF,
        fStar: fStar(p),
        wStar: ws,
        realizedG: realG === -Infinity ? -Infinity : realG,
        expTotal: expTotal,
        optTotal: optTotal,
        r: r,
        busted: busted,
        bankEnd: bank,
        tipped: !!curStage.tipped,
        betWith: betWithTip,
      });
    }

    /* ---- reveal panel between stages (stage 1 shows the full W(f) curve) ---- */
    function showReveal(busted) {
      controls.style.display = 'none';
      revealBox.style.display = '';
      revealBox.replaceChildren();

      var rec = stageResults[stageResults.length - 1];

      var h3 = mk('h3', null, busted ? '💥 ' + curStage.name + ' — BUSTED' : curStage.name + ' — cleared');
      revealBox.appendChild(h3);

      var summary = mk('p', null,
        'You averaged f = <b>' + rec.avgF.toFixed(2) + '</b> over ' + rec.flipsMade + ' flip' +
        (rec.flipsMade === 1 ? '' : 's') + ' (optimal f* = <b>' + rec.fStar.toFixed(2) + '</b>). ' +
        'Realized growth g = <b>' + (rec.realizedG === -Infinity ? '−∞' : rec.realizedG.toFixed(3)) +
        '</b> vs optimum W* = <b>' + rec.wStar.toFixed(3) + '</b> bits/flip. ' +
        'Bankroll ended at <b>' + rec.bankEnd.toFixed(2) + '</b> credits.' +
        (busted ? ' <span class="kc-bust">The reserve hit zero — this stage scores 0.</span>' : ''));
      revealBox.appendChild(summary);

      // The W(f) curve plot with the player's chosen f's marked + f* flagged.
      // Shown for every stage (the spec mandates it for stage 1; it's the core
      // teaching visual, so we draw it everywhere — it always helps).
      revealBox.appendChild(buildCurve(curStage.pEff, rec.avgF));

      var lesson = mk('p', null, '💡 ' + curStage.lesson);
      lesson.style.color = 'var(--cyan)';
      revealBox.appendChild(lesson);

      var next = mk('button', 'btn btn-primary kc-next',
        stageIdx + 1 < STAGES.length ? 'Next stage →' : 'Tally the run →');
      next.addEventListener('click', function () {
        api.sfx('click');
        stageIdx++;
        if (stageIdx >= STAGES.length) {
          finishGame();
        } else {
          loadStage();
        }
      });
      revealBox.appendChild(next);
    }

    /* ---- the W(f) curve as an SVG plot ---- */
    function buildCurve(p, avgF) {
      var box = mk('div', 'kc-curve');
      var W = 600, H = 200, padL = 44, padR = 12, padT = 14, padB = 26;
      var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
        'aria-label': 'Doubling rate W(f) vs stake fraction f' });

      var plotW = W - padL - padR, plotH = H - padT - padB;
      var fLo = 0, fHi = 0.95;
      var fs = fStar(p), ws = wmax(p);

      // y range: from a sensible negative floor up to a bit above W*
      var yHi = Math.max(ws, 0) + 0.03;
      var yLo = Math.min(growthW(0.95, p), -0.05);
      if (yHi - yLo < 0.1) yHi = yLo + 0.1;
      var ySpan = yHi - yLo;

      function xAt(f) { return padL + plotW * (f - fLo) / (fHi - fLo); }
      function yAt(w) { return padT + plotH * (1 - (w - yLo) / ySpan); }

      // zero line
      if (yLo < 0 && yHi > 0) {
        s.appendChild(svg('line', { x1: padL, y1: yAt(0), x2: W - padR, y2: yAt(0), 'class': 'kc-cv-zero' }));
        var z = svg('text', { x: 4, y: yAt(0) + 3, 'class': 'kc-cv-lbl' });
        z.textContent = 'W=0';
        s.appendChild(z);
      }
      // W* gridline
      s.appendChild(svg('line', { x1: padL, y1: yAt(ws), x2: W - padR, y2: yAt(ws), 'class': 'kc-cv-star' }));
      var wl = svg('text', { x: 4, y: yAt(ws) + 3, 'class': 'kc-cv-lbl' });
      wl.textContent = 'W*=' + ws.toFixed(3);
      s.appendChild(wl);

      // the curve
      var pts = '';
      for (var i = 0; i <= 60; i++) {
        var f = fLo + (fHi - fLo) * i / 60;
        var w = growthW(f, p);
        if (w === -Infinity || w < yLo) w = yLo;
        pts += (i ? ' ' : '') + xAt(f).toFixed(1) + ',' + yAt(w).toFixed(1);
      }
      s.appendChild(svg('polyline', { points: pts, 'class': 'kc-cv-line' }));

      // f* marker
      var fsW = growthW(fs, p);
      if (fs > 0) {
        s.appendChild(svg('circle', { cx: xAt(fs), cy: yAt(fsW), r: 4, 'class': 'kc-cv-fstar' }));
        var fl = svg('text', { x: xAt(fs), y: yAt(fsW) - 7, 'class': 'kc-cv-lbl', 'text-anchor': 'middle' });
        fl.textContent = 'f*=' + fs.toFixed(2);
        s.appendChild(fl);
      } else {
        // f* = 0 (fair coin direction): mark the origin
        s.appendChild(svg('circle', { cx: xAt(0), cy: yAt(0), r: 4, 'class': 'kc-cv-fstar' }));
        var fl0 = svg('text', { x: xAt(0) + 4, y: yAt(0) - 7, 'class': 'kc-cv-lbl', 'text-anchor': 'start' });
        fl0.textContent = 'f*=0';
        s.appendChild(fl0);
      }

      // player's average f marker
      var pickW = growthW(avgF, p);
      var pickWClamped = (pickW === -Infinity || pickW < yLo) ? yLo : pickW;
      s.appendChild(svg('circle', { cx: xAt(avgF), cy: yAt(pickWClamped), r: 4, 'class': 'kc-cv-pick' }));
      var pl = svg('text', { x: xAt(avgF), y: yAt(pickWClamped) + 14, 'class': 'kc-cv-lbl', 'text-anchor': 'middle' });
      pl.textContent = 'your avg f=' + avgF.toFixed(2);
      s.appendChild(pl);

      // x-axis ticks
      [0, 0.25, 0.5, 0.75, 0.95].forEach(function (f) {
        var xt = svg('text', { x: xAt(f), y: H - 6, 'class': 'kc-cv-lbl', 'text-anchor': 'middle' });
        xt.textContent = f.toFixed(2);
        s.appendChild(xt);
      });
      var xlbl = svg('text', { x: (padL + W - padR) / 2, y: H - 14, 'class': 'kc-cv-lbl', 'text-anchor': 'middle' });
      xlbl.textContent = 'stake fraction f →   ·   W(f) = p·log₂(1+f) + (1−p)·log₂(1−f)';
      s.appendChild(xlbl);

      box.appendChild(s);
      return box;
    }

    /* ---- HUD status line ---- */
    function pushStatus() {
      var p = effP();
      var g = realizedG();
      var gShown = flipsDone > 0 ? (g === -Infinity ? '−∞' : g.toFixed(2)) : '—';
      api.status('Stage ' + Math.min(stageIdx + 1, STAGES.length) + '/' + STAGES.length +
        ' &middot; ' + bank.toFixed(0) + ' cr' +
        ' &middot; g ' + gShown + ' vs W* ' + wmax(p).toFixed(2));
    }

    /* ---- overall scoring + complete (exactly once) ---- */
    function finishGame() {
      if (finished) return;
      finished = true;
      enableInput(false);
      controls.style.display = 'none';
      revealBox.style.display = 'none';

      var anyBust = stageResults.some(function (r) { return r.busted; });
      var R = 0;
      for (var i = 0; i < stageResults.length; i++) R += stageResults[i].r;
      R = stageResults.length ? R / stageResults.length : 0;

      var stars;
      if (R >= 0.6 && !anyBust) stars = 3;
      else if (R >= 0.35) stars = 2;
      else stars = 1; // finished all stages
      var bits = clamp(Math.round(50 * R), 5, 50);

      var headline = stars === 3 ? 'Compounded like a champion'
        : (stars === 2 ? 'Steady growth' : (anyBust ? 'You survived the bust' : 'Reserve restored'));

      // per-stage table
      var rows = '';
      for (i = 0; i < stageResults.length; i++) {
        var r = stageResults[i];
        var g = r.realizedG === -Infinity ? '−∞' : r.realizedG.toFixed(3);
        rows += '<tr>' +
          '<td>' + (i + 1) + '. ' + r.name + (r.busted ? ' <span class="kc-bust">(bust)</span>' : '') + '</td>' +
          '<td style="text-align:right;">' + r.avgF.toFixed(2) + '</td>' +
          '<td style="text-align:right;">' + r.fStar.toFixed(2) + '</td>' +
          '<td style="text-align:right;">' + g + '</td>' +
          '<td style="text-align:right;">' + r.wStar.toFixed(3) + '</td>' +
          '<td style="text-align:right;">' + (r.r * 100).toFixed(0) + '%</td>' +
          '</tr>';
      }

      var detail =
        '<table><thead><tr>' +
        '<th>Stage</th>' +
        '<th style="text-align:right;">your f̄</th>' +
        '<th style="text-align:right;">f*</th>' +
        '<th style="text-align:right;">real g</th>' +
        '<th style="text-align:right;">W*</th>' +
        '<th style="text-align:right;">score</th>' +
        '</tr></thead><tbody>' + rows +
        '<tr><td><b>Overall R</b></td><td colspan="4"></td>' +
        '<td style="text-align:right;"><b>' + (R * 100).toFixed(0) + '%</b></td></tr>' +
        '</tbody></table>' +
        '<p>Each stage is scored on the <b>expected</b> growth of your chosen ' +
        'fractions, Σ W(fᵢ), against the optimum W* × flips — clipped to [0,1]. ' +
        '(Realized wealth, shown on the chart, is noisy: a great strategy can ' +
        'still get a bad streak, so we grade your <em>decisions</em>, not your luck.' +
        (anyBust ? ' A bust zeroes that stage.' : '') + ')</p>' +
        '<p><b>The Tempter\'s trap:</b> a 55% coin has f* = 0.10 and W* ≈ 0.0072 ' +
        'bits/flip — a sliver. Bet much above 0.20 and W(f) turns negative: you ' +
        'compound <em>downward</em> no matter how hot the streak feels.</p>' +
        '<p><b>The Tip Line:</b> the coin was fair (no edge), yet an 80%-accurate ' +
        'tip is worth I(X;Y) = 1 − H₂(0.8) ≈ 0.278 bits/flip — bet WITH it ' +
        '(effective p = 0.80, f* = 0.60). That growth is the price of information.</p>';

      pushStatus();
      api.complete({
        stars: stars,
        bits: bits,
        headline: headline,
        detailHTML: detail,
      });
    }

    /* ---- wiring ---- */
    slider.addEventListener('input', function () {
      fSel = snapF(parseFloat(slider.value) || 0);
      slider.value = String(fSel);
      fval.textContent = fSel.toFixed(2);
      render();
    });

    btnWith.addEventListener('click', function () {
      if (!stageActive || finished) return;
      betWithTip = true; setToggle(); api.sfx('click'); render(); pushStatus();
    });
    btnAgainst.addEventListener('click', function () {
      if (!stageActive || finished) return;
      betWithTip = false; setToggle(); api.sfx('click'); render(); pushStatus();
    });

    flip1.addEventListener('click', function () { doFlip(); });
    flip5.addEventListener('click', function () { doFlip5(); });

    function onKey(e) {
      if (finished) return;
      if (e.key === 'Enter' || e.key === ' ') {
        if (stageActive && !flip1.disabled) { e.preventDefault(); doFlip(); }
      }
    }
    document.addEventListener('keydown', onKey);

    // first stage
    loadStage();

    return {
      destroy: function () {
        clearTimers();
        document.removeEventListener('keydown', onKey);
      },
    };
  },
});

})();
