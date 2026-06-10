/* THE QUIET ARCHIPELAGO — noisy-bridge puzzle.
   Redundancy under a budget: lay 1/3/5 planks per segment (majority must hold),
   watch per-segment & whole-bridge survival, then cross with real randomness.
   The storm-soaked plank contract of the Parity Sisters. */
(function () {
'use strict';

/* ---------------- pure logic (tested in scratch; see commit notes) ----------------
   Majority survival for k planks, each independently snapping w.p. p:
     P1 = 1-p
     P3 = (1-p)^3 + 3p(1-p)^2          (3-of-3 and 2-of-3)
     P5 = (1-p)^5 + 5p(1-p)^4 + 10p^2(1-p)^3   (5,4,3 of 5)
   Whole bridge = product of segment survivals. */
function segSurvive(p, k) {
  var q = 1 - p;
  if (k === 1) return q;
  if (k === 3) return q * q * q + 3 * p * q * q;
  if (k === 5) return q * q * q * q * q + 5 * p * q * q * q * q + 10 * p * p * q * q * q;
  return 0;
}
function bridgeSurvive(p, planks) {
  var s = 1;
  for (var i = 0; i < planks.length; i++) s *= segSurvive(p, planks[i]);
  return s;
}
function planksSpent(planks) {
  var t = 0;
  for (var i = 0; i < planks.length; i++) t += planks[i];
  return t;
}
var STEPS = [1, 3, 5];

/* ---------------- style (once) ---------------- */
var STYLE_ID = 'nb-style';
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  var s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = [
    '.nb-wrap{display:flex;flex-direction:column;gap:.8rem;}',
    '.nb-clause{font-size:.82rem;color:var(--muted);line-height:1.5;font-style:italic;}',
    '.nb-river{position:relative;background:linear-gradient(180deg,#16314d,#0c2034);',
    '  border:1px solid var(--surface2);border-radius:12px;padding:.7rem .5rem;overflow:hidden;}',
    '.nb-rain{position:absolute;inset:0;pointer-events:none;opacity:.5;',
    '  background:repeating-linear-gradient(72deg,transparent 0 7px,rgba(160,200,240,.10) 7px 8px);',
    '  animation:nb-rain 0.5s linear infinite;}',
    '@keyframes nb-rain{from{background-position:0 0;}to{background-position:6px 20px;}}',
    '.nb-track{position:relative;display:flex;align-items:stretch;gap:6px;min-height:84px;}',
    '.nb-seg{flex:1 1 0;min-width:48px;display:flex;flex-direction:column;align-items:center;',
    '  gap:4px;justify-content:flex-end;}',
    '.nb-planks{display:flex;flex-direction:column-reverse;gap:3px;width:100%;align-items:center;}',
    '.nb-plank{width:84%;height:9px;border-radius:3px;background:#b07a44;',
    '  border:1px solid #6e4a25;box-shadow:0 1px 0 #5a3a1c;transition:.25s;}',
    '.nb-plank.snapped{background:#3a2a1c;border-color:#241810;opacity:.45;',
    '  transform:translateX(0) rotate(-7deg);box-shadow:none;}',
    '.nb-seg.cross-ok .nb-deck{background:var(--green);}',
    '.nb-seg.cross-bad .nb-deck{background:var(--red);}',
    '.nb-deck{width:100%;height:6px;border-radius:3px;background:var(--surface2);transition:.25s;}',
    '.nb-pp{font-size:.66rem;color:var(--muted);text-align:center;line-height:1.25;min-height:1.9rem;}',
    '.nb-pp b{color:var(--text);}',
    '.nb-step{display:flex;gap:4px;align-items:center;justify-content:center;}',
    '.nb-sbtn{min-width:40px;min-height:40px;border-radius:8px;border:2px solid var(--surface2);',
    '  background:var(--surface);color:var(--text);font-size:1.1rem;cursor:pointer;line-height:1;}',
    '.nb-sbtn:hover:not(:disabled){border-color:var(--blue);color:var(--blue);}',
    '.nb-sbtn:disabled{opacity:.35;cursor:default;}',
    '.nb-kcount{min-width:30px;text-align:center;font-weight:600;font-size:.95rem;}',
    '.nb-walker{position:absolute;bottom:50px;left:0;width:18px;height:18px;border-radius:50%;',
    '  background:radial-gradient(circle at 35% 30%,#eaf4ff,#9cc3e8);border:2px solid #21405e;',
    '  box-shadow:0 2px 5px rgba(0,0,0,.5);transition:left .42s ease,bottom .3s;z-index:3;',
    '  display:none;}',
    '.nb-walker.show{display:block;}',
    '.nb-walker.dunk{bottom:6px;background:#6fb3d6;transition:left .2s,bottom .3s;}',
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
    '.nb-over{color:var(--red);}',
    '.nb-row{display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;}',
    '.nb-lesson{font-size:.9rem;line-height:1.5;color:var(--text);}',
    '.nb-lesson b{color:var(--cyan);}',
    '@media(max-width:420px){.nb-meters{grid-template-columns:1fr;}}'
  ].join('');
  document.head.appendChild(s);
}

G.puzzles.register('noisy-bridge', {
  title: 'The Plank Contract',
  create: function (root, config, api) {
    injectStyle();
    var p = (typeof config.p === 'number') ? config.p : 0.25;
    var n = config.segments || 4;
    var budget = (typeof config.budget === 'number') ? config.budget : n * 3;
    p = Math.max(0, Math.min(0.95, p));

    // per-segment chosen redundancy (index into STEPS) and live state
    var planks = [];        // current planks per segment
    for (var i = 0; i < n; i++) planks.push(1);
    var locked = [];        // segments already crossed (held)
    for (i = 0; i < n; i++) locked.push(false);
    var phase = 'plan';     // 'plan' | 'crossing' | 'recover'
    var timers = [];
    var spent = 0;          // planks already consumed by held segments

    function totalSpentNow() {
      // planks committed to held segments + planks staged on remaining segments
      var t = spent;
      for (var i = 0; i < n; i++) if (!locked[i]) t += planks[i];
      return t;
    }
    function leftToBuy() { return budget - totalSpentNow(); }

    /* ---------- DOM ---------- */
    var wrap = document.createElement('div');
    wrap.className = 'nb-wrap';
    wrap.innerHTML =
      '<div class="g-card">' +
        '<div class="nb-clause">Clause IX: the storm snaps each plank with chance ' +
          '<b>p = ' + fmtP(p) + '</b>. A segment holds only if a <b>majority</b> of ' +
          'its planks survive (1-of-1, 2-of-3, 3-of-5). Spend no more than your driftwood allows.</div>' +
      '</div>' +
      '<div class="nb-river"><div class="nb-rain"></div>' +
        '<div class="nb-track" id="nb-track"></div>' +
        '<div class="nb-walker" id="nb-walker"></div>' +
        '<div class="nb-splash" id="nb-splash"></div>' +
      '</div>' +
      '<div class="g-card nb-meters" id="nb-meters"></div>' +
      '<div class="nb-clause" id="nb-line">more copies = more reliable = more expensive — redundancy is how messages survive noise.</div>' +
      '<div class="nb-row">' +
        '<button class="btn btn-primary" id="nb-cross">Cross the bridge</button>' +
        '<span class="g-pill" id="nb-phase">planning</span>' +
      '</div>' +
      '<div id="nb-result"></div>';
    root.appendChild(wrap);

    var trackEl = wrap.querySelector('#nb-track');
    var metersEl = wrap.querySelector('#nb-meters');
    var lineEl = wrap.querySelector('#nb-line');
    var crossBtn = wrap.querySelector('#nb-cross');
    var phaseEl = wrap.querySelector('#nb-phase');
    var resultEl = wrap.querySelector('#nb-result');
    var walkerEl = wrap.querySelector('#nb-walker');
    var splashEl = wrap.querySelector('#nb-splash');

    /* ---------- build segment columns ---------- */
    var segEls = [];
    function buildTrack() {
      trackEl.innerHTML = '';
      segEls = [];
      for (var i = 0; i < n; i++) {
        var seg = document.createElement('div');
        seg.className = 'nb-seg';
        seg.innerHTML =
          '<div class="nb-pp"></div>' +
          '<div class="nb-planks"></div>' +
          '<div class="nb-deck"></div>' +
          '<div class="nb-step">' +
            '<button class="nb-sbtn nb-minus" aria-label="fewer planks">−</button>' +
            '<span class="nb-kcount"></span>' +
            '<button class="nb-sbtn nb-plus" aria-label="more planks">+</button>' +
          '</div>';
        trackEl.appendChild(seg);
        (function (idx, segNode) {
          segNode.querySelector('.nb-minus').addEventListener('click', function () { step(idx, -1); });
          segNode.querySelector('.nb-plus').addEventListener('click', function () { step(idx, 1); });
        })(i, seg);
        segEls.push(seg);
      }
    }

    function step(i, dir) {
      if (phase !== 'plan' && phase !== 'recover') return;
      if (locked[i]) return;
      var cur = STEPS.indexOf(planks[i]);
      var next = cur + dir;
      if (next < 0 || next >= STEPS.length) return;
      var wantK = STEPS[next];
      var delta = wantK - planks[i];
      if (delta > 0 && delta > leftToBuy()) {
        api.fail('Not enough driftwood for that.');
        return;
      }
      planks[i] = wantK;
      api.sfx('select');
      render();
    }

    /* ---------- render ---------- */
    function render() {
      for (var i = 0; i < n; i++) {
        var seg = segEls[i];
        var k = planks[i];
        var ps = segSurvive(p, k);
        var planksBox = seg.querySelector('.nb-planks');
        planksBox.innerHTML = '';
        for (var j = 0; j < k; j++) {
          var pl = document.createElement('div');
          pl.className = 'nb-plank';
          planksBox.appendChild(pl);
        }
        seg.querySelector('.nb-kcount').textContent = String(k);
        seg.querySelector('.nb-pp').innerHTML =
          (locked[i] ? '<b style="color:var(--green)">held</b>' :
            ('P<sub>' + k + '</sub> <b>' + pct(ps) + '</b>'));
        var minus = seg.querySelector('.nb-minus');
        var plus = seg.querySelector('.nb-plus');
        var planning = (phase === 'plan' || phase === 'recover') && !locked[i];
        minus.disabled = !planning || STEPS.indexOf(k) === 0;
        var up = STEPS[STEPS.indexOf(k) + 1];
        plus.disabled = !planning || up === undefined || (up - k) > leftToBuy();
      }
      var surv = bridgeSurvive(p, planks);
      var spentTot = totalSpentNow();
      var left = budget - spentTot;
      metersEl.innerHTML =
        '<div class="nb-meter">planks spent / budget' +
          '<div class="v ' + (left < 0 ? 'nb-over' : '') + '">' + spentTot + ' / ' + budget + '</div>' +
          '<div class="g-bar"><div class="g-bar-fill" style="width:' +
            Math.min(100, (spentTot / budget) * 100) + '%;background:' +
            (left < 0 ? 'var(--red)' : 'var(--blue)') + '"></div></div>' +
        '</div>' +
        '<div class="nb-meter">whole-bridge survival' +
          '<div class="v nb-big">' + pct(surv) + '</div>' +
          '<div class="g-bar"><div class="g-bar-fill" style="width:' + (surv * 100) +
            '%;background:var(--green)"></div></div>' +
        '</div>';
      crossBtn.disabled = (phase === 'crossing') || left < 0;
      phaseEl.textContent = phase === 'crossing' ? 'crossing…' :
        (phase === 'recover' ? 'storm calms — re-spend' : 'planning');
      updateStatus(left, surv);
    }
    function updateStatus(left, surv) {
      api.status('planks left: <b>' + left + '</b> &nbsp;·&nbsp; bridge survival: <b>' + pct(surv) + '</b>');
    }

    /* ---------- crossing animation ---------- */
    function clearTimers() { for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]); timers = []; }
    function after(ms, fn) { var id = setTimeout(fn, ms); timers.push(id); }

    function cross() {
      if (phase === 'crossing') return;
      // anti-softlock: ensure each REMAINING (unlocked) segment can afford >=1 plank
      ensureDriftwood();
      // commit: lock the planks of every unlocked segment that the player intends to cross
      phase = 'crossing';
      resultEl.innerHTML = '';
      render();
      crossBtn.disabled = true;
      walkerEl.classList.add('show');
      walkerEl.classList.remove('dunk');

      var order = [];
      for (var i = 0; i < n; i++) order.push(i);
      var idx = 0;
      var failedAt = -1;

      function placeWalker(segIndex) {
        var seg = segEls[segIndex];
        var center = seg.offsetLeft + seg.offsetWidth / 2 - 9;
        walkerEl.style.left = center + 'px';
        walkerEl.style.bottom = '50px';
      }
      // start at first unlocked segment
      function firstUnlocked(from) { for (var k = from; k < n; k++) if (!locked[k]) return k; return n; }
      idx = firstUnlocked(0);
      if (idx < n) placeWalker(idx);

      function stepCross() {
        if (idx >= n) { succeed(); return; }
        if (locked[idx]) { idx++; after(120, stepCross); return; }
        placeWalker(idx);
        after(380, function () { resolveSegment(idx); });
      }

      function resolveSegment(i) {
        var k = planks[i];
        var survived = 0, snapped = [];
        for (var j = 0; j < k; j++) {
          if (api.rng() >= p) survived++; else snapped.push(j);
        }
        var need = Math.floor(k / 2) + 1; // majority
        var holds = survived >= need;
        // consume these planks from budget permanently
        spent += k;
        // visualize snapped planks
        var planksBox = segEls[i].querySelector('.nb-planks');
        var plankNodes = planksBox.querySelectorAll('.nb-plank');
        for (var s = 0; s < snapped.length; s++) {
          if (plankNodes[snapped[s]]) plankNodes[snapped[s]].classList.add('snapped');
        }
        if (holds) {
          locked[i] = true;
          segEls[i].classList.add('cross-ok');
          api.sfx('step');
          idx = i + 1;
          after(360, stepCross);
        } else {
          failedAt = i;
          api.sfx('splash');
          dunk(i);
        }
      }

      function dunk(i) {
        walkerEl.classList.add('dunk');
        var seg = segEls[i];
        splashEl.style.left = (seg.offsetLeft + seg.offsetWidth / 2) + 'px';
        splashEl.classList.remove('go');
        // force reflow then animate
        void splashEl.offsetWidth;
        splashEl.classList.add('go');
        segEls[i].classList.add('cross-bad');
        after(700, function () { recover(i); });
      }

      stepCross();
    }

    function succeed() {
      phase = 'done';
      walkerEl.style.left = (trackEl.offsetWidth - 18) + 'px';
      api.sfx('solve');
      lineEl.innerHTML = 'The walker steps onto the far stones. Dry.';
      resultEl.innerHTML =
        '<div class="g-card nb-lesson">You just chose a <b>code rate</b>: planks per segment = ' +
        'redundancy per bit. The noisier the storm, the more copies truth needs. ' +
        '<b>Repetition trades bandwidth for reliability.</b></div>' +
        '<div class="nb-row"><button class="btn btn-primary" id="nb-fin">Step onto Beacon Stones</button></div>';
      resultEl.querySelector('#nb-fin').addEventListener('click', function () { api.complete(); });
      render();
    }

    function recover(i) {
      // refund: the snapped planks of failed segment(s) come back as the storm calms.
      // Held segments stay held; failed segment(s) reset to 1 plank and become re-spendable.
      phase = 'recover';
      walkerEl.classList.remove('show', 'dunk');
      // reset all UNlocked segments (the failed one + any beyond it) to a fresh single plank;
      // their previously-staged planks were NOT consumed (only the failed segment's were),
      // but we already added `spent` for the failed segment — refund it so driftwood returns.
      spent -= planks[i]; // refund the planks of the segment that dunked us
      for (var s = 0; s < n; s++) {
        if (!locked[s]) {
          segEls[s].classList.remove('cross-bad', 'cross-ok');
          planks[s] = 1;
          var pb = segEls[s].querySelector('.nb-planks');
          var nodes = pb.querySelectorAll('.nb-plank.snapped');
          for (var z = 0; z < nodes.length; z++) nodes[z].classList.remove('snapped');
        }
      }
      ensureDriftwood();
      lineEl.innerHTML = 'A segment gave way — but you were not hurt. Snapped planks float back. Re-spend on what remains.';
      api.sfx('open');
      render();
      crossBtn.disabled = false;
    }

    function ensureDriftwood() {
      // count remaining (unlocked) segments
      var remaining = 0;
      for (var i = 0; i < n; i++) if (!locked[i]) remaining++;
      if (remaining === 0) return;
      // each remaining segment is at minimum 1 plank already; spendable left must cover the gap
      // to at least 1 plank each. Since planks default to >=1, left can be negative only if
      // committed exceeds budget. Top budget up to exactly afford 1/segment if needed.
      // minimum total cost = spent (held) + remaining * 1
      var minNeed = spent + remaining; // 1 plank each remaining
      if (budget < minNeed) {
        budget = minNeed;
        lineEl.innerHTML = 'The sisters send driftwood. (Budget topped up so the crossing is always possible.)';
        api.sfx('spark');
      }
    }

    crossBtn.addEventListener('click', cross);

    buildTrack();
    render();

    return {
      destroy: function () {
        clearTimers();
        var st = document.getElementById(STYLE_ID);
        // leave style for reuse; just clear timers + dom refs
      }
    };

    /* ---------- format helpers ---------- */
    function pct(x) { return (x * 100).toFixed(1) + '%'; }
    function fmtP(x) { return x.toFixed(2); }
  }
});

})();
