/* THE QUIET ARCHIPELAGO — 'noisy-bridge' puzzle (PEDAGOGY §6.9 deep rework).
   Redundancy under a budget, taught in two rounds:
     HOOK    — chain-survival prediction: independence multiplies.
     GUIDE   — uniform storm, instruments ON: live per-segment and whole-bridge
               survival; Bea walks the product once. Gate = rate the bridge
               at/above the contract line (threshold derived from the config,
               under the config budget), then cross.
     MASTERY — segments get unequal exposure (internal multipliers on config p,
               rendered as visibly stormier water). Whole-bridge % SEALED;
               per-segment % only via 3 inspections. The player DECLARES the
               crossing: a certified bridge (internal P >= threshold) that
               still snaps is rebuilt free ("good codes still fail — rarely.
               Bad ones fail surely."); an uncertified bridge costs the round
               (reset, fresh exposures).
     DEBRIEF — their allocation vs even spread vs one-span pile-up, computed;
               repetition-vs-Hamming moral.
   Config (FROZEN): { p, segments, budget } (+ optional threshold override).
   Threshold derived as floor(93% of the best uniform allocation under budget).
   Exposure multipliers are internal and tuned per config so that:
     (a) even spread misses the threshold,
     (b) all-planks-on-one-segment misses it,
     (c) reinforce-the-weakest (greedy) clears it with margin. */
(function () {
'use strict';

var TYPE = 'noisy-bridge';
var STEPS = [1, 3, 5];

/* ================= pure logic (mirrored in _smoke/pz_test_noisy-bridge.mjs) ================ */

/* Majority survival for k planks, each independently snapping w.p. p:
     P1 = 1-p
     P3 = (1-p)^3 + 3p(1-p)^2                   (3-of-3 and 2-of-3)
     P5 = (1-p)^5 + 5p(1-p)^4 + 10p^2(1-p)^3    (5,4,3 of 5)            */
function segSurvive(p, k) {
  var q = 1 - p;
  if (k === 1) return q;
  if (k === 3) return q * q * q + 3 * p * q * q;
  if (k === 5) return q * q * q * q * q + 5 * p * q * q * q * q + 10 * p * p * q * q * q;
  return 0;
}
/* Whole bridge = product of segment survivals (uniform p). */
function bridgeSurvive(p, planks) {
  var s = 1;
  for (var i = 0; i < planks.length; i++) s *= segSurvive(p, planks[i]);
  return s;
}
/* Same, heterogeneous per-segment p. */
function bridgeSurviveHet(ps, planks) {
  var s = 1;
  for (var i = 0; i < ps.length; i++) s *= segSurvive(ps[i], planks[i]);
  return s;
}
function planksTotal(planks) {
  var t = 0;
  for (var i = 0; i < planks.length; i++) t += planks[i];
  return t;
}
function clampP(x) { return Math.max(0.02, Math.min(0.9, x)); }

/* Best uniform allocation under budget: counts (a 1s, b 3s, c 5s), a+b+c=n. */
function uniformBest(p, n, budget) {
  var best = null;
  for (var c = 0; c <= n; c++) {
    for (var b = 0; b + c <= n; b++) {
      var a = n - b - c;
      var cost = a + 3 * b + 5 * c;
      if (cost > budget) continue;
      var P = Math.pow(segSurvive(p, 1), a) * Math.pow(segSurvive(p, 3), b) *
              Math.pow(segSurvive(p, 5), c);
      if (!best || P > best.P) best = { P: P, counts: [a, b, c], cost: cost };
    }
  }
  if (!best) best = { P: Math.pow(segSurvive(p, 1), n), counts: [n, 0, 0], cost: n };
  return best;
}

/* The contract line: just under the best a perfect uniform build can rate. */
function deriveThreshold(p, n, budget, override) {
  if (typeof override === 'number') return Math.max(0.01, Math.min(0.99, override));
  var T = Math.floor(uniformBest(p, n, budget).P * 0.93 * 100) / 100;
  return Math.max(0.05, T);
}

/* Exhaustive best heterogeneous allocation (n <= 9; greedy fallback above). */
function enumerateBest(ps, budget) {
  var n = ps.length;
  if (n > 9) {
    var g = greedyAlloc(ps, budget);
    return { P: bridgeSurviveHet(ps, g), alloc: g };
  }
  var best = null, alloc = [];
  (function rec(i, cost) {
    if (cost > budget) return;
    if (i === n) {
      var P = bridgeSurviveHet(ps, alloc);
      if (!best || P > best.P) best = { P: P, alloc: alloc.slice() };
      return;
    }
    for (var s = 0; s < STEPS.length; s++) {
      alloc[i] = STEPS[s];
      rec(i + 1, cost + STEPS[s]);
    }
    alloc.length = i;
  })(0, 0);
  return best || { P: bridgeSurviveHet(ps, ps.map(function () { return 1; })),
                   alloc: ps.map(function () { return 1; }) };
}

/* Reinforce-the-weakest: start at 1 plank each, repeatedly upgrade the segment
   whose CURRENT survival is lowest (every upgrade costs 2). The informed play. */
function greedyAlloc(ps, budget) {
  var n = ps.length, planks = [], i;
  for (i = 0; i < n; i++) planks.push(1);
  var left = budget - n;
  while (left >= 2) {
    var idx = -1, worst = 2;
    for (i = 0; i < n; i++) {
      if (planks[i] >= 5) continue;
      var s = segSurvive(ps[i], planks[i]);
      if (s < worst - 1e-12) { worst = s; idx = i; }
    }
    if (idx < 0) break;
    planks[idx] += 2;
    left -= 2;
  }
  return planks;
}

/* Even spread: the same count everywhere, as high as the budget evenly allows. */
function flatEvenAlloc(n, budget) {
  var k = 1;
  if (3 * n <= budget) k = 3;
  if (5 * n <= budget) k = 5;
  var a = [];
  for (var i = 0; i < n; i++) a.push(k);
  return a;
}

/* All planks on one segment (1 everywhere else); best case over positions. */
function lopsidedBest(ps, budget) {
  var n = ps.length, best = null;
  var k = 1;
  if ((n - 1) + 3 <= budget) k = 3;
  if ((n - 1) + 5 <= budget) k = 5;
  for (var i = 0; i < n; i++) {
    var alloc = [];
    for (var j = 0; j < n; j++) alloc.push(j === i ? k : 1);
    var P = bridgeSurviveHet(ps, alloc);
    if (!best || P > best.P) best = { P: P, alloc: alloc, at: i };
  }
  return best;
}

/* Tier plan: how many calm / open / wild segments for n segments. */
function tierCounts(n) {
  var wild = Math.max(1, Math.round(n * 0.4));
  var calm = Math.max(1, Math.round(n * 0.4));
  while (calm + wild > n) { if (calm >= wild) calm--; else wild--; }
  return { calm: calm, norm: n - calm - wild, wild: wild };
}

/* Per-segment snap chances for a tier layout (sorted calm..wild). */
function psForMults(p, tc, calmM, wildM) {
  var ps = [], i;
  for (i = 0; i < tc.calm; i++) ps.push(clampP(p * calmM));
  for (i = 0; i < tc.norm; i++) ps.push(clampP(p));
  for (i = 0; i < tc.wild; i++) ps.push(clampP(p * wildM));
  return ps;
}

/* Pick exposure multipliers for THIS config so the §6.9 constraints hold. */
function chooseMults(p, n, budget, T) {
  var WILDS = [1.4, 1.35, 1.45, 1.3, 1.5, 1.25, 1.55, 1.2, 1.6];
  var CALMS = [0.36, 0.4, 0.32, 0.44, 0.3, 0.5];
  var tc = tierCounts(n);
  function evalPair(cm, wm) {
    var ps = psForMults(p, tc, cm, wm);
    var g = greedyAlloc(ps, budget);
    return {
      calmM: cm, wildM: wm, tiers: tc, ps: ps,
      flatP: bridgeSurviveHet(ps, flatEvenAlloc(n, budget)),
      lopP: lopsidedBest(ps, budget).P,
      optP: enumerateBest(ps, budget).P,
      greedyP: bridgeSurviveHet(ps, g),
      greedy: g,
    };
  }
  var fallback = null, fbScore = Infinity;
  for (var w = 0; w < WILDS.length; w++) {
    for (var c = 0; c < CALMS.length; c++) {
      var e = evalPair(CALMS[c], WILDS[w]);
      var ok = e.optP >= T + 0.02 && e.greedyP >= T + 0.01 &&
               e.flatP <= T - 0.01 && e.lopP <= T - 0.05;
      if (ok) return e;
      var score = Math.max(0, T + 0.02 - e.optP) + Math.max(0, T + 0.01 - e.greedyP) +
                  Math.max(0, e.flatP - (T - 0.01)) + Math.max(0, e.lopP - (T - 0.05));
      if (score < fbScore) { fbScore = score; fallback = e; }
    }
  }
  return fallback;
}

/* ================= style (once) ================= */

var STYLE_ID = 'nb-style';
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  var s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = [
    '.nb-wrap{display:flex;flex-direction:column;gap:.8rem;}',
    '.nb-clause{font-size:.82rem;color:var(--muted);line-height:1.5;font-style:italic;}',
    '.nb-clause b{color:var(--text);}',
    '.nb-river{position:relative;background:linear-gradient(180deg,#16314d,#0c2034);',
    '  border:1px solid var(--surface2);border-radius:12px;padding:.7rem .5rem;overflow:hidden;}',
    '.nb-rain{position:absolute;inset:0;pointer-events:none;opacity:.5;',
    '  background:repeating-linear-gradient(72deg,transparent 0 7px,rgba(160,200,240,.10) 7px 8px);',
    '  animation:nb-rain 0.5s linear infinite;}',
    '@keyframes nb-rain{from{background-position:0 0;}to{background-position:6px 20px;}}',
    '.nb-track{position:relative;display:flex;align-items:stretch;gap:6px;min-height:84px;}',
    '.nb-seg{flex:1 1 0;min-width:44px;display:flex;flex-direction:column;align-items:center;',
    '  gap:4px;justify-content:flex-end;border-radius:8px;padding:2px;}',
    '.nb-inspecting .nb-seg{cursor:pointer;}',
    '.nb-inspecting .nb-seg:hover{outline:2px dashed var(--cyan);outline-offset:-2px;}',
    '.nb-planks{display:flex;flex-direction:column-reverse;gap:3px;width:100%;align-items:center;}',
    '.nb-plank{width:84%;height:9px;border-radius:3px;background:#b07a44;',
    '  border:1px solid #6e4a25;box-shadow:0 1px 0 #5a3a1c;transition:.25s;}',
    '.nb-plank.snapped{background:#3a2a1c;border-color:#241810;opacity:.45;',
    '  transform:translateX(0) rotate(-7deg);box-shadow:none;}',
    '.nb-seg.cross-ok .nb-deck{background:var(--green);}',
    '.nb-seg.cross-bad .nb-deck{background:var(--red);}',
    '.nb-deck{width:100%;height:6px;border-radius:3px;background:var(--surface2);transition:.25s;}',
    /* per-segment water: calm / open / wild — visibly different in mastery */
    '.nb-water{width:100%;height:13px;border-radius:4px;overflow:hidden;}',
    '.nb-t0 .nb-water{background:linear-gradient(180deg,#2a5f80,#1d4a66);}',
    '.nb-t1 .nb-water{background:repeating-linear-gradient(90deg,#173a52 0 7px,#235377 7px 14px);',
    '  animation:nb-flow 2.6s linear infinite;}',
    '.nb-t2 .nb-water{background:repeating-linear-gradient(90deg,#0b2233 0 4px,#2a6a90 4px 7px,#d9eef9 7px 9px);',
    '  animation:nb-flow .55s linear infinite;}',
    '@keyframes nb-flow{from{background-position:0 0;}to{background-position:28px 0;}}',
    '.nb-tier{font-size:.64rem;line-height:1.2;letter-spacing:.04em;min-height:.9rem;text-align:center;}',
    '.nb-t0 .nb-tier{color:#7fb8d8;}',
    '.nb-t1 .nb-tier{color:var(--muted);}',
    '.nb-t2 .nb-tier{color:var(--red);font-weight:700;}',
    '.nb-pp{font-size:.68rem;color:var(--muted);text-align:center;line-height:1.25;min-height:1.5rem;}',
    '.nb-pp b{color:var(--text);}',
    '.nb-pp .nb-q{color:var(--yellow);font-size:.95rem;}',
    '.nb-step{display:flex;flex-direction:column;gap:3px;align-items:stretch;width:100%;}',
    '.nb-sbtn{width:100%;min-height:44px;border-radius:8px;border:2px solid var(--surface2);',
    '  background:var(--surface);color:var(--text);font-size:1.1rem;cursor:pointer;line-height:1;}',
    '.nb-sbtn:hover:not(:disabled){border-color:var(--blue);color:var(--blue);}',
    '.nb-sbtn:disabled{opacity:.35;cursor:default;}',
    '.nb-kcount{text-align:center;font-weight:600;font-size:.95rem;}',
    '.nb-walker{position:absolute;bottom:50px;left:0;width:18px;height:18px;border-radius:50%;',
    '  background:radial-gradient(circle at 35% 30%,#eaf4ff,#9cc3e8);border:2px solid #21405e;',
    '  box-shadow:0 2px 5px rgba(0,0,0,.5);transition:left .42s ease,bottom .3s;z-index:3;',
    '  display:none;}',
    '.nb-walker.show{display:block;}',
    '.nb-walker.dunk{bottom:6px !important;background:#6fb3d6;transition:left .2s,bottom .3s;}',
    '.nb-splash{position:absolute;bottom:6px;width:26px;height:26px;border-radius:50%;',
    '  border:2px solid rgba(160,210,240,.8);transform:translate(-50%,40%) scale(.2);',
    '  opacity:0;z-index:2;}',
    '.nb-splash.go{animation:nb-splash .6s ease-out;}',
    '@keyframes nb-splash{0%{opacity:.9;transform:translate(-50%,40%) scale(.2);}',
    '  100%{opacity:0;transform:translate(-50%,40%) scale(2.4);}}',
    '.nb-meters{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;}',
    '.nb-meter{font-size:.8rem;}',
    '.nb-meter .v{font-size:1.15rem;font-weight:700;}',
    '.nb-big{color:var(--green);}',
    '.nb-sealed{color:var(--yellow);letter-spacing:.1em;}',
    '.nb-over{color:var(--red);}',
    '.nb-barwrap{position:relative;}',
    '.nb-tick{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--gold);}',
    '.nb-row{display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;}',
    '.nb-row .btn{min-height:44px;}',
    '.nb-inspectbtn.on{border-color:var(--cyan);color:var(--cyan);}',
    '.nb-lesson{font-size:.9rem;line-height:1.5;color:var(--text);}',
    '.nb-lesson b{color:var(--cyan);}',
    '.nb-stack{display:flex;flex-direction:column;gap:.6rem;}',
    '.nb-vs{display:grid;grid-template-columns:auto auto;gap:.15rem .8rem;',
    '  font-variant-numeric:tabular-nums;margin:.3rem 0;}',
    '.nb-vs .nb-you{color:var(--green);font-weight:700;}',
    '@media(max-width:420px){.nb-meters{grid-template-columns:1fr;}',
    '  .nb-pp{font-size:.62rem;}.nb-tier{font-size:.56rem;}}'
  ].join('');
  document.head.appendChild(s);
}

/* ================= format helpers ================= */
function pct(x) { return (x * 100).toFixed(1) + '%'; }
function pct0(x) { return Math.round(x * 100) + '%'; }
function fmtP(x) { return x.toFixed(2); }

var TIER_GLYPH = ['~ calm', '≈ open', '≋ wild'];

/* ================= mechanic ================= */

G.puzzles.register(TYPE, {
  title: 'The Plank Contract',

  /* pure logic exposed for the scratch test + drive (not used by the engine) */
  _logic: {
    STEPS: STEPS, segSurvive: segSurvive, bridgeSurvive: bridgeSurvive,
    bridgeSurviveHet: bridgeSurviveHet, planksTotal: planksTotal,
    uniformBest: uniformBest, deriveThreshold: deriveThreshold,
    enumerateBest: enumerateBest, greedyAlloc: greedyAlloc,
    flatEvenAlloc: flatEvenAlloc, lopsidedBest: lopsidedBest,
    tierCounts: tierCounts, psForMults: psForMults, chooseMults: chooseMults,
  },

  create: function (root, config, api) {
    injectStyle();
    var p0 = clampP(typeof config.p === 'number' ? config.p : 0.25);
    var n = Math.max(1, config.segments || 4);
    var budget = (typeof config.budget === 'number') ? config.budget : n * 3;
    if (budget < n) budget = n;

    var T = deriveThreshold(p0, n, budget, config.threshold);
    var tuning = chooseMults(p0, n, budget, T);
    /* effective mastery line: never above what reinforce-the-weakest can rate
       (identical to T for the shipped configs; guards degenerate configs). */
    var effT = Math.min(T, Math.max(0.05, Math.floor(tuning.greedyP * 100) / 100));

    var TIER_P = [clampP(p0 * tuning.calmM), p0, clampP(p0 * tuning.wildM)];

    /* ---------- state ---------- */
    var round = G.pz.taught(TYPE) ? 2 : 1;  // taught -> straight to mastery
    var phase = 'hook';   // hook|plan|crossing|rebuild|lost|transition|debrief
    var planks = [], exposures = [], revealed = [], segEls = [];
    var inspections = 3, inspectMode = false;
    var completed = false, timers = [];
    var ladder = G.pz.hintLadder([
      'A bridge is only as good as its <b>weakest segment</b> — the product is hostage to its smallest factor.',
      'Spend your inspections on the <b>stormiest water</b>. The wild churn hides the smallest factor.',
      'Name the build: <b>one plank on calm water, five where it rages</b> — then pour every leftover plank into whatever is weakest now.',
    ]);

    function clearTimers() { for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]); timers = []; }
    function after(ms, fn) { var id = setTimeout(fn, ms); timers.push(id); }
    function shuffle(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(api.rng() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
    function currentPs() {
      var ps = [];
      for (var i = 0; i < n; i++) ps.push(exposures[i].p);
      return ps;
    }
    function currentP() { return bridgeSurviveHet(currentPs(), planks); }
    function spent() { return planksTotal(planks); }

    /* ---------- DOM scaffold ---------- */
    var wrap = document.createElement('div');
    wrap.className = 'nb-wrap';
    wrap.innerHTML =
      '<div id="nb-banner"></div>' +
      '<div id="nb-coach" class="nb-stack"></div>' +
      '<div id="nb-hook"></div>' +
      '<div id="nb-main" style="display:none">' +
        '<div class="g-card"><div class="nb-clause" id="nb-clause"></div></div>' +
        '<div class="nb-river"><div class="nb-rain"></div>' +
          '<div class="nb-track" id="nb-track"></div>' +
          '<div class="nb-walker" id="nb-walker"></div>' +
          '<div class="nb-splash" id="nb-splash"></div>' +
        '</div>' +
        '<div class="g-card nb-meters" id="nb-meters"></div>' +
        '<div class="nb-clause" id="nb-line"></div>' +
        '<div class="nb-row">' +
          '<button class="btn nb-inspectbtn" id="nb-inspect" type="button" style="display:none"></button>' +
          '<button class="btn btn-primary" id="nb-cross" type="button"></button>' +
          '<span class="g-pill" id="nb-phase"></span>' +
        '</div>' +
        '<div id="nb-result" class="nb-stack"></div>' +
      '</div>';
    root.appendChild(wrap);

    var bannerEl = wrap.querySelector('#nb-banner');
    var coachEl = wrap.querySelector('#nb-coach');
    var hookEl = wrap.querySelector('#nb-hook');
    var mainEl = wrap.querySelector('#nb-main');
    var clauseEl = wrap.querySelector('#nb-clause');
    var riverEl = wrap.querySelector('.nb-river');
    var trackEl = wrap.querySelector('#nb-track');
    var walkerEl = wrap.querySelector('#nb-walker');
    var splashEl = wrap.querySelector('#nb-splash');
    var metersEl = wrap.querySelector('#nb-meters');
    var lineEl = wrap.querySelector('#nb-line');
    var inspectBtn = wrap.querySelector('#nb-inspect');
    var crossBtn = wrap.querySelector('#nb-cross');
    var phaseEl = wrap.querySelector('#nb-phase');
    var resultEl = wrap.querySelector('#nb-result');

    function setCoach(html) {
      coachEl.innerHTML = '';
      if (html) coachEl.appendChild(G.pz.coachCard('bea', html));
    }
    function setBanner(rn, label) {
      bannerEl.innerHTML = '';
      bannerEl.appendChild(G.pz.roundBanner(rn, 2, label));
    }

    /* ---------- segments ---------- */
    function buildTrack() {
      trackEl.innerHTML = '';
      segEls = [];
      for (var i = 0; i < n; i++) {
        var seg = document.createElement('div');
        seg.className = 'nb-seg nb-t' + exposures[i].tier;
        seg.dataset.tier = String(exposures[i].tier);
        seg.innerHTML =
          '<div class="nb-pp"></div>' +
          '<div class="nb-planks"></div>' +
          '<div class="nb-deck"></div>' +
          '<div class="nb-water"></div>' +
          '<div class="nb-tier"></div>' +
          '<div class="nb-step">' +
            '<button class="nb-sbtn nb-plus" type="button" aria-label="more planks">+</button>' +
            '<span class="nb-kcount"></span>' +
            '<button class="nb-sbtn nb-minus" type="button" aria-label="fewer planks">−</button>' +
          '</div>';
        trackEl.appendChild(seg);
        (function (idx, segNode) {
          segNode.querySelector('.nb-minus').addEventListener('click', function () { step(idx, -1); });
          segNode.querySelector('.nb-plus').addEventListener('click', function () { step(idx, 1); });
          segNode.addEventListener('click', function (ev) {
            if (!inspectMode) return;
            if (ev.target.closest && ev.target.closest('.nb-sbtn')) return;
            inspect(idx);
          });
        })(i, seg);
        segEls.push(seg);
      }
    }

    function step(i, dir) {
      if (phase !== 'plan') return;
      var cur = STEPS.indexOf(planks[i]);
      var next = cur + dir;
      if (next < 0 || next >= STEPS.length) return;
      var delta = STEPS[next] - planks[i];
      if (delta > 0 && spent() + delta > budget) {
        api.fail('Not enough driftwood for that.');
        return;
      }
      planks[i] = STEPS[next];
      api.sfx('select');
      render();
    }

    function inspect(i) {
      if (phase !== 'plan' || round !== 2) return;
      if (revealed[i]) { inspectMode = false; render(); return; }
      if (inspections <= 0) return;
      revealed[i] = true;
      inspections--;
      inspectMode = false;
      api.sfx('select');
      render();
    }

    /* ---------- render ---------- */
    function render() {
      var mastery = (round === 2);
      for (var i = 0; i < n; i++) {
        var seg = segEls[i];
        var k = planks[i];
        var box = seg.querySelector('.nb-planks');
        box.innerHTML = '';
        for (var j = 0; j < k; j++) {
          var pl = document.createElement('div');
          pl.className = 'nb-plank';
          box.appendChild(pl);
        }
        seg.querySelector('.nb-kcount').textContent = String(k);
        seg.querySelector('.nb-tier').textContent = mastery ? TIER_GLYPH[exposures[i].tier] : '';
        var pp = seg.querySelector('.nb-pp');
        if (!mastery || revealed[i]) {
          pp.innerHTML = 'P<sub>' + k + '</sub> <b>' + pct(segSurvive(exposures[i].p, k)) + '</b>';
        } else {
          pp.innerHTML = '<span class="nb-q">?</span>';
        }
        var planning = (phase === 'plan');
        var si = STEPS.indexOf(k);
        seg.querySelector('.nb-minus').disabled = !planning || si === 0;
        seg.querySelector('.nb-plus').disabled =
          !planning || si === STEPS.length - 1 || (STEPS[si + 1] - k) > (budget - spent());
      }

      var sp = spent(), left = budget - sp;
      var P = currentP();
      var survHtml;
      if (!mastery) {
        survHtml =
          '<div class="nb-meter">whole-bridge survival · contract ≥ ' + pct0(T) +
            '<div class="v nb-big">' + pct(P) + '</div>' +
            '<div class="nb-barwrap"><div class="g-bar"><div class="g-bar-fill" style="width:' +
              Math.min(100, P * 100) + '%;background:var(--green)"></div></div>' +
              '<div class="nb-tick" style="left:' + (T * 100) + '%"></div></div>' +
          '</div>';
      } else {
        survHtml =
          '<div class="nb-meter">whole-bridge survival · contract ≥ ' + pct0(effT) +
            '<div class="v nb-sealed">? ? ?</div>' +
            '<div class="nb-barwrap"><div class="g-bar"></div>' +
              '<div class="nb-tick" style="left:' + (effT * 100) + '%"></div></div>' +
          '</div>';
      }
      metersEl.innerHTML =
        '<div class="nb-meter">planks spent / budget' +
          '<div class="v ' + (left < 0 ? 'nb-over' : '') + '">' + sp + ' / ' + budget + '</div>' +
          '<div class="g-bar"><div class="g-bar-fill" style="width:' +
            Math.min(100, (sp / budget) * 100) + '%;background:' +
            (left < 0 ? 'var(--red)' : 'var(--blue)') + '"></div></div>' +
        '</div>' + survHtml;

      inspectBtn.style.display = mastery ? '' : 'none';
      inspectBtn.textContent = inspectMode ? 'Tap a segment…' : ('Inspect water (' + inspections + ' left)');
      inspectBtn.disabled = phase !== 'plan' || inspections <= 0;
      inspectBtn.classList.toggle('on', inspectMode);
      trackEl.classList.toggle('nb-inspecting', inspectMode);

      crossBtn.textContent = mastery ? 'Declare the crossing' : 'Cross the bridge';
      crossBtn.disabled = phase !== 'plan';
      phaseEl.textContent =
        phase === 'plan' ? (mastery ? 'sealed manifest' : 'planning') :
        phase === 'crossing' ? 'crossing…' :
        phase === 'rebuild' ? 'rebuilt free' :
        phase === 'lost' ? 'storm took it' :
        phase === 'transition' ? 'across' : 'signed';

      if (!mastery) {
        api.status('rated <b>' + pct(P) + '</b> · contract ≥ ' + pct0(T) +
          ' · planks ' + sp + '/' + budget);
      } else {
        api.status('rated <b>???</b> · contract ≥ ' + pct0(effT) +
          ' · planks ' + sp + '/' + budget + ' · inspections ' + inspections + '/3');
      }
    }

    /* ---------- walker animation ---------- */
    function placeWalker(i) {
      var seg = segEls[i];
      var deck = seg.querySelector('.nb-deck');
      walkerEl.style.left = (seg.offsetLeft + seg.offsetWidth / 2 - 9) + 'px';
      var rRect = riverEl.getBoundingClientRect();
      var dRect = deck.getBoundingClientRect();
      walkerEl.style.bottom = Math.max(20, rRect.bottom - dRect.top + 2) + 'px';
    }
    function splashAt(i) {
      var seg = segEls[i];
      splashEl.style.left = (seg.offsetLeft + seg.offsetWidth / 2) + 'px';
      splashEl.classList.remove('go');
      void splashEl.offsetWidth;
      splashEl.classList.add('go');
    }
    function clearCrossingMarks() {
      for (var i = 0; i < n; i++) {
        segEls[i].classList.remove('cross-ok', 'cross-bad');
        var snapped = segEls[i].querySelectorAll('.nb-plank.snapped');
        for (var j = 0; j < snapped.length; j++) snapped[j].classList.remove('snapped');
      }
      walkerEl.classList.remove('show', 'dunk');
    }

    /* Real crossing of a certified bridge: every snap is forgiven (free rebuild). */
    function cross() {
      phase = 'crossing';
      resultEl.innerHTML = '';
      render();
      clearCrossingMarks();
      walkerEl.classList.add('show');
      var idx = 0;

      function stepCross() {
        if (idx >= n) { onCrossed(); return; }
        placeWalker(idx);
        after(380, function () { resolveSeg(idx); });
      }
      function resolveSeg(i) {
        var k = planks[i], snapped = [];
        for (var j = 0; j < k; j++) if (api.rng() < exposures[i].p) snapped.push(j);
        var holds = (k - snapped.length) >= Math.floor(k / 2) + 1;
        var nodes = segEls[i].querySelectorAll('.nb-plank');
        for (var s = 0; s < snapped.length; s++) {
          if (nodes[snapped[s]]) nodes[snapped[s]].classList.add('snapped');
        }
        if (holds) {
          segEls[i].classList.add('cross-ok');
          api.sfx('step');
          idx = i + 1;
          after(360, stepCross);
        } else {
          segEls[i].classList.add('cross-bad');
          api.sfx('splash');
          walkerEl.classList.add('dunk');
          splashAt(i);
          after(700, showRebuild);
        }
      }
      stepCross();
    }

    /* The §6.9 forgiveness: certified bridge, unlucky dice. */
    function showRebuild() {
      phase = 'rebuild';
      render();
      setCoach('<b>Good codes still fail — rarely. Bad ones fail surely.</b> ' +
        'Your bridge was rated above the line; the storm just rolled lucky. ' +
        'I’ll rebuild it free — same planks, same spans.');
      var card = document.createElement('div');
      card.className = 'g-card nb-row';
      card.innerHTML = '<button class="btn btn-primary" id="nb-again" type="button">Cross again — rebuilt free</button>';
      resultEl.innerHTML = '';
      resultEl.appendChild(card);
      card.querySelector('#nb-again').addEventListener('click', function () {
        api.sfx('open');
        cross();
      });
    }

    function onCrossed() {
      walkerEl.style.left = (trackEl.offsetWidth - 18) + 'px';
      api.sfx('solve');
      if (round === 1) guideSuccess(); else showDebrief();
    }

    /* Uncertified declaration: the storm takes it. Costs the round. */
    function doomedCross() {
      phase = 'crossing';
      resultEl.innerHTML = '';
      render();
      clearCrossingMarks();
      walkerEl.classList.add('show');
      var target = 0, worst = 2;
      for (var i = 0; i < n; i++) {
        var s = segSurvive(exposures[i].p, planks[i]);
        if (s < worst) { worst = s; target = i; }
      }
      var idx = 0;
      function stepDoom() {
        placeWalker(idx);
        if (idx >= target) { after(380, function () { snapAt(target); }); return; }
        after(380, function () {
          segEls[idx].classList.add('cross-ok');
          api.sfx('step');
          idx++;
          stepDoom();
        });
      }
      function snapAt(i) {
        var k = planks[i], need = Math.floor(k / 2) + 1;
        var order = [];
        for (var j = 0; j < k; j++) order.push(j);
        shuffle(order);
        var nodes = segEls[i].querySelectorAll('.nb-plank');
        for (var s = 0; s < need; s++) {
          if (nodes[order[s]]) nodes[order[s]].classList.add('snapped');
        }
        segEls[i].classList.add('cross-bad');
        api.sfx('splash');
        walkerEl.classList.add('dunk');
        splashAt(i);
        after(700, roundLost);
      }
      stepDoom();
    }

    function roundLost() {
      phase = 'lost';
      render();
      api.sfx('fail');
      var hint = ladder.fail();
      setCoach('The manifest came up short of <b>' + pct0(effT) + '</b> — an uncertified ' +
        'bridge fails surely, just not always where you watched. Fresh storm, fresh water.' +
        (hint ? '<br><br>' + hint : ''));
      var card = document.createElement('div');
      card.className = 'g-card nb-row';
      card.innerHTML = '<button class="btn btn-primary" id="nb-retry" type="button">Rebuild and face a fresh storm</button>';
      resultEl.innerHTML = '';
      resultEl.appendChild(card);
      card.querySelector('#nb-retry').addEventListener('click', function () {
        api.sfx('open');
        resetMastery();
      });
    }

    /* ---------- rounds ---------- */
    function productWalk() {
      var parts = [], P = 1;
      for (var i = 0; i < n; i++) {
        var s = segSurvive(exposures[i].p, planks[i]);
        parts.push(s.toFixed(2));
        P *= s;
      }
      return 'Every span alone holds <b>' + pct(segSurvive(p0, 1)) + '</b>. But you need ' +
        'ALL ' + n + ': ' + parts.join(' × ') + ' ≈ <b>' + pct(P) + '</b>. ' +
        '<b>Multiply — never average.</b> Planks buy each factor back up; ' +
        'I sign nothing rated under <b>' + pct0(T) + '</b>.';
    }

    function startGuide() {
      round = 1;
      phase = 'plan';
      exposures = [];
      planks = [];
      for (var i = 0; i < n; i++) {
        exposures.push({ tier: 1, p: p0 });
        planks.push(1);
      }
      hookEl.innerHTML = '';
      mainEl.style.display = '';
      setBanner(1, 'the contract — instruments on');
      clauseEl.innerHTML = 'Clause IX: the storm snaps each plank with chance <b>p = ' + fmtP(p0) +
        '</b>. A span holds only if a <b>majority</b> of its planks hold (1-of-1, 2-of-3, 3-of-5). ' +
        'Budget: <b>' + budget + '</b> planks. Bea signs no bridge rated under <b>' + pct0(T) + '</b>.';
      lineEl.innerHTML = 'Live instruments: every plank you add updates the span and the whole bridge.';
      buildTrack();
      setCoach(productWalk());
      resultEl.innerHTML = '';
      render();
    }

    function makeExposures() {
      var tiers = [];
      var i;
      for (i = 0; i < tuning.tiers.calm; i++) tiers.push(0);
      for (i = 0; i < tuning.tiers.norm; i++) tiers.push(1);
      for (i = 0; i < tuning.tiers.wild; i++) tiers.push(2);
      shuffle(tiers);
      exposures = [];
      for (i = 0; i < n; i++) exposures.push({ tier: tiers[i], p: TIER_P[tiers[i]] });
    }

    function startMastery(introHtml) {
      round = 2;
      phase = 'plan';
      makeExposures();
      planks = [];
      revealed = [];
      for (var i = 0; i < n; i++) { planks.push(1); revealed.push(false); }
      inspections = 3;
      inspectMode = false;
      hookEl.innerHTML = '';
      mainEl.style.display = '';
      setBanner(2, 'the worst stretch — instruments sealed');
      clauseEl.innerHTML = 'Clause X: same storm, uneven water — planks snap <b>more often in the churn, ' +
        'less in the lee</b>. The whole-bridge rating stays under Bea’s hat until you declare. ' +
        'Budget: <b>' + budget + '</b> planks. Contract line: <b>' + pct0(effT) + '</b>.';
      lineEl.innerHTML = 'Read the water. Three inspections. Declare when you trust the build — ' +
        'a certified bridge that snaps is rebuilt free; an uncertified one costs the round.';
      buildTrack();
      setCoach(introHtml ||
        'This stretch is uneven — calm pools, open water, wild churn. My gauges are blunt: ' +
        '<b>three inspections</b>, no more. The whole-bridge number stays sealed. ' +
        'Spend planks where the storm bites hardest.');
      resultEl.innerHTML = '';
      render();
    }

    function resetMastery() {
      clearTimers();
      clearCrossingMarks();
      startMastery('Fresh water, fresh churn — the calm spans moved. Read it again.');
    }

    function guideSuccess() {
      phase = 'transition';
      ladder.reset();
      render();
      setCoach('Across, and dry. Now the worst stretch — up there the water is NOT the same ' +
        'under every span, and my instruments come off. Find the weak factors yourself.');
      var card = document.createElement('div');
      card.className = 'g-card nb-row';
      card.innerHTML = '<button class="btn btn-primary" id="nb-next" type="button">Walk on — the worst stretch</button>';
      resultEl.innerHTML = '';
      resultEl.appendChild(card);
      card.querySelector('#nb-next').addEventListener('click', function () {
        api.sfx('open');
        clearCrossingMarks();
        startMastery();
      });
    }

    /* ---------- gate ---------- */
    function onAction() {
      if (phase !== 'plan') return;
      var P = currentP();
      if (round === 1) {
        if (P >= T) {
          ladder.reset();
          cross();
        } else {
          api.fail('Rated ' + pct(P) + ' — the contract line is ' + pct0(T) + '.');
          var hint = ladder.fail();
          setCoach('Rated <b>' + pct(P) + '</b> against a contract line of <b>' + pct0(T) +
            '</b>. I sign manifests, not hopes — buy back your weakest factors.' +
            (hint ? '<br><br>' + hint : ''));
        }
      } else {
        inspectMode = false;
        if (P >= effT) {
          ladder.reset();
          cross();          // certified: any snap is forgiven, rebuilt free
        } else {
          doomedCross();    // uncertified: the storm takes it; costs the round
        }
      }
    }
    crossBtn.addEventListener('click', onAction);
    inspectBtn.addEventListener('click', function () {
      if (phase !== 'plan' || inspections <= 0) return;
      inspectMode = !inspectMode;
      api.sfx('choice');
      render();
    });

    /* ---------- debrief ---------- */
    function showDebrief() {
      phase = 'debrief';
      ladder.reset();
      render();
      setCoach(null);
      var ps = currentPs();
      var youP = bridgeSurviveHet(ps, planks);
      var evenP = bridgeSurviveHet(ps, flatEvenAlloc(n, budget));
      var lopP = lopsidedBest(ps, budget).P;
      var html =
        'P(bridge) = ∏ P(span) — the product is hostage to its <b>smallest factor</b>, ' +
        'so planks go where the factor is smallest.' +
        '<div class="nb-vs">' +
          '<span class="nb-you">your build</span><span class="nb-you">' + pct(youP) + '</span>' +
          '<span>even spread (' + flatEvenAlloc(n, budget)[0] + ' everywhere)</span><span>' + pct(evenP) + '</span>' +
          '<span>all planks on one span</span><span>' + pct(lopP) + '</span>' +
        '</div>' +
        'And the moral: repetition is the <b>dumbest code</b> — three planks for one vote. ' +
        'The lighthouse charms bought the same safety from <b>3 charms on 4 runes</b>. ' +
        '<b>Smarter redundancy beats more redundancy.</b>';
      resultEl.innerHTML = '';
      resultEl.appendChild(G.pz.debriefCard({
        title: 'The Plank Contract — signed',
        html: html,
        buttonLabel: 'Step onto the far stones',
        tone: 'win',
        onButton: function () {
          if (completed) return;
          completed = true;
          G.pz.markTaught(TYPE);
          api.complete();
        },
      }));
    }

    /* ---------- boot ---------- */
    if (round === 2) {
      startMastery('You know the contract — straight to the worst stretch. ' +
        'Three inspections; declare when you trust the build.');
    } else {
      api.status('predict first — then we build');
      hookEl.appendChild(G.pz.hookCard({
        question: 'One plank holds 9 times in 10. Five spans in a row — how often do you cross dry?',
        options: [
          { label: '~90%', note: 'planks are planks' },
          { label: '~75%', note: 'a little worse' },
          { label: '~59%', note: 'barely beats a coin' },
        ],
        correct: 2,
        reveal: 'Every span must hold: 0.9 × 0.9 × 0.9 × 0.9 × 0.9 ≈ <b>59%</b>. ' +
          'Independent failures <b>multiply</b> — a chain is weaker than any of its links.',
        onDone: function () { startGuide(); },
      }));
    }

    return {
      destroy: function () { clearTimers(); }
    };
  }
});

})();
