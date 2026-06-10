/* THE QUIET ARCHIPELAGO — pair-lock (mutual information dials).
   The twin dials of the Mirror Spires hum in unison. Dial A spins on its own;
   the player tunes dial B to resonate. The joint heat grid shows HOW the towers
   move together, and I(X;Y) tells you WHY one tower can predict the other.
   Contract: ../../DESIGN.md schema #11. IIFE, no globals. */
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

/* ============================ style ============================ */

var STYLE_ID = 'pl-style';
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  var s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = [
    '.pl-wrap{display:flex;flex-direction:column;gap:0.85rem;}',
    '.pl-flavor{color:var(--muted);font-size:0.86rem;line-height:1.5;font-style:italic;}',
    '.pl-flavor b{color:var(--purple);font-style:normal;}',
    '.pl-grid-card{display:flex;flex-direction:column;gap:0.55rem;align-items:center;}',
    '.pl-gridlabel{font-size:0.72rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--dim);align-self:flex-start;}',
    '.pl-heat{display:grid;gap:3px;}',
    '.pl-hcell{display:flex;align-items:center;justify-content:center;min-width:40px;min-height:40px;',
      'border-radius:7px;font-size:0.72rem;color:#0b1020;font-variant-numeric:tabular-nums;',
      'border:1px solid transparent;transition:box-shadow 0.15s,border-color 0.15s;}',
    '.pl-hcell.pl-corner{background:transparent;color:var(--purple);font-weight:600;}',
    '.pl-hcell.pl-hdr{background:var(--surface2);color:var(--text);font-weight:600;font-size:1.1rem;}',
    '.pl-hcell.pl-arow{box-shadow:0 0 0 2px var(--purple);}',
    '.pl-hcell.pl-hint{border-color:var(--gold);box-shadow:0 0 0 2px var(--gold),0 0 12px var(--gold);}',
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
    '.pl-readouts{display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;}',
    '.pl-ro{background:var(--surface);border:1px solid var(--surface2);border-radius:10px;padding:0.5rem;text-align:center;}',
    '.pl-ro .pl-rok{font-size:0.68rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--dim);}',
    '.pl-ro .pl-rov{font-size:1.15rem;font-weight:600;font-variant-numeric:tabular-nums;margin-top:0.15rem;}',
    '.pl-ro.pl-you .pl-rov{color:var(--green);}',
    '.pl-ro.pl-best .pl-rov{color:var(--gold);}',
    '.pl-ro.pl-chance .pl-rov{color:var(--muted);}',
    '.pl-mi{text-align:center;font-size:0.9rem;line-height:1.5;color:var(--text);}',
    '.pl-mi b{color:var(--cyan);font-variant-numeric:tabular-nums;}',
    '.pl-controls{display:flex;gap:0.6rem;justify-content:center;flex-wrap:wrap;}',
    '.pl-feedback{text-align:center;min-height:1.3rem;font-size:0.95rem;font-weight:600;}',
    '.pl-feedback.pl-good{color:var(--green);}',
    '.pl-feedback.pl-miss{color:var(--muted);}',
    '.pl-lesson{background:rgba(167,139,250,0.1);border:1px solid var(--purple);border-radius:12px;',
      'padding:0.9rem;font-size:0.9rem;line-height:1.55;color:var(--text);}',
    '.pl-lesson b{color:var(--purple);}',
  ].join('');
  document.head.appendChild(s);
}

// heat color: pale lavender -> bright purple by probability share
function heatColor(p, maxp) {
  var t = maxp > 0 ? p / maxp : 0;
  // interpolate between a faint and a saturated purple
  var r = Math.round(0xc4 + (0x8b - 0xc4) * t);
  var g = Math.round(0xc0 + (0x5c - 0xc0) * t);
  var b = Math.round(0xf4 + (0xf4 - 0xf4) * t);
  // brighten luminance so dark cells stay readable
  var base = 0.35 + 0.65 * t;
  r = Math.round(0x6c + (r - 0x6c) * base);
  g = Math.round(0x54 + (g - 0x54) * base);
  b = Math.round(0x9a + (b - 0x9a) * base);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

/* ============================ mechanic ============================ */

G.puzzles.register('pair-lock', {
  title: 'The Twin Dials',
  create: function (root, config, api) {
    ensureStyle();

    var rawJoint = (config.joint && config.joint.length) ? config.joint : [[0.4, 0.1], [0.1, 0.4]];
    var J = normalizeJoint(rawJoint);
    var n = J[0].length;
    var labels = (config.labels && config.labels.length >= n)
      ? config.labels.slice(0, n)
      : ['☾', '☀', '★', '✦', '✧', '◈'].slice(0, n);
    var rounds = config.rounds || 8;
    var goal = config.goal || 5;

    var pa = rowMarginals(J);
    var best = bestRate(J);
    var chance = chanceRate(J);
    var mi = mutualInfoBits(J);
    // flat-grid maxp for heat normalization
    var maxp = 0, i, j;
    for (i = 0; i < J.length; i++) for (j = 0; j < n; j++) if (J[i][j] > maxp) maxp = J[i][j];

    var round = 0, hits = 0, picks = 0;
    var curA = -1;          // sampled dial-A symbol this round
    var pickB = -1;         // player's chosen B
    var phase = 'spin';     // 'spin' (need to spin A) | 'guess' | 'reveal' | 'done'
    var hintsUnlocked = false;
    var timers = [];

    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function pushStatus() {
      api.status('round ' + Math.min(round + (phase === 'spin' ? 1 : 0), rounds) +
        '/' + rounds + ' &middot; resonance ' + hits + '/' + goal);
    }

    /* ---- DOM ---- */
    root.innerHTML =
      '<div class="pl-wrap">' +
        '<div class="pl-flavor">The Warden fox watches, tail curled. <b>Two towers, one hum.</b> ' +
          'Dial A turns by itself; tune dial B to answer it.</div>' +
        '<div class="g-card pl-grid-card">' +
          '<div class="pl-gridlabel">how the towers move together — P(A,B)</div>' +
          '<div class="pl-heat"></div>' +
        '</div>' +
        '<div class="pl-mi">the towers share I(X;Y) = <b>' + mi.toFixed(2) + ' bits</b><br>' +
          '<span style="color:var(--muted);font-size:0.82rem">that&rsquo;s WHY seeing one tells you about the other</span></div>' +
        '<div class="pl-dialrow">' +
          '<div class="pl-dialA"><div class="pl-dface" id="pl-A">·</div><div class="pl-caption">tower A</div></div>' +
          '<div class="pl-dialA"><div class="pl-dface" id="pl-B">·</div><div class="pl-caption">tower B (you)</div></div>' +
        '</div>' +
        '<div class="pl-bbtns" id="pl-bbtns"></div>' +
        '<div class="pl-feedback" id="pl-fb">&nbsp;</div>' +
        '<div class="pl-readouts">' +
          '<div class="pl-ro pl-you"><div class="pl-rok">your hits</div><div class="pl-rov" id="pl-you">0%</div></div>' +
          '<div class="pl-ro pl-best"><div class="pl-rok">best possible</div><div class="pl-rov">' + Math.round(best * 100) + '%</div></div>' +
          '<div class="pl-ro pl-chance"><div class="pl-rok">blind chance</div><div class="pl-rov">' + Math.round(chance * 100) + '%</div></div>' +
        '</div>' +
        '<div class="pl-controls">' +
          '<button class="btn btn-primary" id="pl-spin">Spin tower A</button>' +
          '<button class="btn" id="pl-hint" style="display:none">Hint</button>' +
        '</div>' +
        '<div id="pl-end"></div>' +
      '</div>';

    var heatEl = root.querySelector('.pl-heat');
    var aFace = root.querySelector('#pl-A');
    var bFace = root.querySelector('#pl-B');
    var bbtns = root.querySelector('#pl-bbtns');
    var fbEl = root.querySelector('#pl-fb');
    var youEl = root.querySelector('#pl-you');
    var spinBtn = root.querySelector('#pl-spin');
    var hintBtn = root.querySelector('#pl-hint');
    var endEl = root.querySelector('#pl-end');

    /* ---- build heat grid (header row + body) ---- */
    heatEl.style.gridTemplateColumns = 'auto repeat(' + n + ', 1fr)';
    var cellRefs = []; // cellRefs[a][b]
    // header row
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
    for (i = 0; i < J.length; i++) {
      var rowHdr = document.createElement('div');
      rowHdr.className = 'pl-hcell pl-hdr';
      rowHdr.textContent = labels[i];
      heatEl.appendChild(rowHdr);
      var rr = [];
      for (j = 0; j < n; j++) {
        var c = document.createElement('div');
        c.className = 'pl-hcell';
        c.style.background = heatColor(J[i][j], maxp);
        c.textContent = (J[i][j] * 100).toFixed(0);
        c.setAttribute('data-a', i);
        c.setAttribute('data-b', j);
        heatEl.appendChild(c);
        rr.push(c);
      }
      cellRefs.push(rr);
    }

    /* ---- B symbol buttons ---- */
    var btnRefs = [];
    for (j = 0; j < n; j++) {
      (function (idx) {
        var b = document.createElement('button');
        b.className = 'pl-bbtn';
        b.textContent = labels[idx];
        b.disabled = true;
        b.addEventListener('click', function () { chooseB(idx); });
        bbtns.appendChild(b);
        btnRefs.push(b);
      })(j);
    }

    function highlightRow(a) {
      var x, y;
      for (x = 0; x < cellRefs.length; x++)
        for (y = 0; y < n; y++) cellRefs[x][y].classList.toggle('pl-arow', x === a);
    }
    function clearRowHighlight() {
      cellRefs.forEach(function (r) { r.forEach(function (c) { c.classList.remove('pl-arow', 'pl-hint'); }); });
    }
    function setBtnsEnabled(on) {
      btnRefs.forEach(function (b) { b.disabled = !on; });
    }

    function spinA() {
      if (phase !== 'spin' || round >= rounds) return;
      phase = 'guess';
      pickB = -1;
      curA = sampleIdx(pa, api.rng());
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
      hintBtn.style.display = hintsUnlocked ? '' : 'none';
      hintBtn.disabled = false;
      api.sfx('select');
      pushStatus();
    }

    function showHint() {
      if (phase !== 'guess' || curA < 0) return;
      var cond = conditionalRow(J, curA);
      var bestB = argmax(cond);
      cellRefs[curA][bestB].classList.add('pl-hint');
      btnRefs[bestB].classList.add('pl-sel');
      fbEl.textContent = 'The warden nods toward ' + labels[bestB] + ' — most likely given ' + labels[curA] + '.';
      fbEl.className = 'pl-feedback';
      api.sfx('select');
    }

    function chooseB(b) {
      if (phase !== 'guess') return;
      phase = 'reveal';
      pickB = b;
      picks++;
      setBtnsEnabled(false);
      hintBtn.disabled = true;
      btnRefs.forEach(function (x, k) { x.classList.toggle('pl-sel', k === b); });
      bFace.textContent = labels[b];

      // sample B's truth from the conditional row given A
      var cond = conditionalRow(J, curA);
      var truth = sampleIdx(cond, api.rng());

      later(function () {
        bFace.textContent = labels[truth];
        bFace.classList.add('pl-truth');
        var match = (truth === b);
        if (match) {
          hits++;
          fbEl.textContent = '✦ Chime! Both towers rang ' + labels[truth] + '. +1 resonance.';
          fbEl.className = 'pl-feedback pl-good';
          api.sfx('spark');
        } else {
          fbEl.textContent = 'Tower B settled on ' + labels[truth] + '. No chime this turn.';
          fbEl.className = 'pl-feedback pl-miss';
          api.sfx('bump');
        }
        round++;
        youEl.textContent = picks > 0 ? Math.round(hits / picks * 100) + '%' : '0%';
        if (!hintsUnlocked && round >= 2) { hintsUnlocked = true; }
        pushStatus();

        if (hits >= goal) { later(win, 650); return; }
        if (round >= rounds) { later(lose, 750); return; }

        // ready next spin
        phase = 'spin';
        spinBtn.disabled = false;
        clearRowHighlight();
        hintBtn.style.display = hintsUnlocked ? '' : 'none';
      }, 480);
    }

    function win() {
      if (phase === 'done') return;
      phase = 'done';
      spinBtn.disabled = true;
      hintBtn.disabled = true;
      setBtnsEnabled(false);
      endEl.innerHTML =
        '<div class="pl-lesson"><b>The towers lock in unison.</b> ' +
        'Dependence is shared information: dial A leaked I(X;Y) = ' + mi.toFixed(2) + ' bits about dial B, ' +
        'so reading one let you tune the other above blind chance. ' +
        'With <b>independent towers</b> the heat grid is flat and no strategy beats chance — there <b>I(X;Y) = 0</b>, ' +
        'and seeing A would tell you nothing.</div>';
      api.sfx('solve');
      api.complete();
    }

    function lose() {
      if (phase === 'done') return;
      // out of rounds: fail + auto-reset
      api.fail('The towers drift apart. Listen again.');
      reset();
    }

    function reset() {
      round = 0; hits = 0; picks = 0; curA = -1; pickB = -1;
      phase = 'spin'; hintsUnlocked = false;
      aFace.textContent = '·'; bFace.textContent = '·';
      aFace.classList.remove('pl-truth'); bFace.classList.remove('pl-truth');
      youEl.textContent = '0%';
      fbEl.textContent = 'The dials still. Spin tower A to begin again.';
      fbEl.className = 'pl-feedback';
      endEl.innerHTML = '';
      clearRowHighlight();
      setBtnsEnabled(false);
      btnRefs.forEach(function (b) { b.classList.remove('pl-sel'); });
      spinBtn.disabled = false;
      hintBtn.style.display = 'none';
      pushStatus();
    }

    spinBtn.addEventListener('click', spinA);
    hintBtn.addEventListener('click', showHint);

    fbEl.textContent = 'Spin tower A to begin.';
    pushStatus();

    return {
      destroy: function () {
        clearTimers();
        spinBtn.removeEventListener('click', spinA);
        hintBtn.removeEventListener('click', showHint);
        root.innerHTML = '';
      },
    };
  },
});

})();
