/* THE QUIET ARCHIPELAGO — 'scales' puzzle (DEEP REWORK per PEDAGOGY.md §6.2).
   N look-alike coins; one fake with a KNOWN direction (odd:'light'|'heavy').
   Teaching loop: HOOK ("how many weighings to be CERTAIN?" -> three-outcomes
   reveal) -> GUIDE (suspect ledger shown; Shannon narrates each elimination;
   any weighing whose WORST-CASE surviving candidate count exceeds
   3^(weighings remaining) is interrupted and the round resets — that
   interruption IS the lesson) -> MASTERY (no ledger; optional pencil marks;
   same gate) -> DEBRIEF (the player's actual weighings drawn as a ternary
   outcome tree; 3^k counting; log₂3 ≈ 1.58 bits per weighing).

   GATE (both rounds): fake found in <= K weighings AND the accusation must be
   FORCED — internal candidate set of size 1. An early accusation is a guess:
   instant reset with a fresh fake. Kill-switch: weigh-junk-then-guess can
   never complete (junk weighings are interrupted; guesses always reset).

   Contract: js/core/overlay.js (create(root, config, api); api = {complete,
   fail, close, sfx, status, rng}). Config: { coins:n, odd, weighings:k }
   (frozen island config: {coins:9, odd:'light', weighings:2}).
   Shared kit: js/core/pzkit.js (G.pz). Style prefix 'sc-'. No timers. */
(function () {
'use strict';

/* ------------------------------------------------------------------ */
/* pure logic (exposed on the def as _logic for the scratch test)      */
/* ------------------------------------------------------------------ */

// Subset of `cands` consistent with a weighing of (left vs right) showing tilt.
// tilt: 'left'    = left pan went DOWN (left side heavier)
//       'right'   = right pan went DOWN
//       'balance' = level. odd = 'light' | 'heavy'.
function applyWeighing(cands, left, right, tilt, odd) {
  var ls = {}, rs = {};
  left.forEach(function (c) { ls[c] = true; });
  right.forEach(function (c) { rs[c] = true; });
  return cands.filter(function (c) {
    var inL = !!ls[c], inR = !!rs[c], side;
    if (odd === 'heavy') side = inL ? 'left' : (inR ? 'right' : 'balance');
    else side = inL ? 'right' : (inR ? 'left' : 'balance'); // light fake's pan rises
    return side === tilt;
  });
}

// Tilt the scale shows given the TRUE fake coin (used to answer truthfully).
function predictTilt(fake, left, right, odd) {
  var inL = left.indexOf(fake) >= 0, inR = right.indexOf(fake) >= 0;
  if (!inL && !inR) return 'balance';
  if (odd === 'heavy') return inL ? 'left' : 'right';
  return inL ? 'right' : 'left';
}

// equal, non-empty pans?
function pansValid(left, right) {
  return left.length > 0 && left.length === right.length;
}

// ceil(log3 n): weighings that suffice (and are necessary)
function ceilLog3(n) {
  if (n <= 1) return 0;
  var k = 0, p = 1;
  while (p < n) { p *= 3; k++; }
  return k;
}

function pow3(k) {
  var p = 1;
  while (k-- > 0) p *= 3;
  return p;
}

// Sizes of the three candidate piles a weighing makes: [onLeft, onRight, off].
// (The outcome->pile mapping depends on `odd`, but the SIZES do not.)
function splitSizes(cands, left, right) {
  var ls = {}, rs = {};
  left.forEach(function (c) { ls[c] = true; });
  right.forEach(function (c) { rs[c] = true; });
  var a = 0, b = 0, off = 0;
  cands.forEach(function (c) {
    if (ls[c]) a++; else if (rs[c]) b++; else off++;
  });
  return [a, b, off];
}

// Worst-case surviving candidate count over the three outcomes.
function worstCase(cands, left, right) {
  var s = splitSizes(cands, left, right);
  return Math.max(s[0], s[1], s[2]);
}

// THE key-beat predicate: did this weighing destroy worst-case certainty?
// True iff certainty was achievable before (|C| <= 3^(remAfter+1)) and the
// worst outcome pile exceeds what the remaining weighings can tell apart.
function certaintyLost(candsBefore, left, right, remAfter) {
  if (candsBefore.length > pow3(remAfter + 1)) return false; // already doomed; budget reset handles it
  return worstCase(candsBefore, left, right) > pow3(remAfter);
}

// Accusation is only FORCED (not a guess) when one candidate remains.
function canAccuse(cands) { return cands.length === 1; }

/* ------------------------------------------------------------------ */
/* one-time style                                                     */
/* ------------------------------------------------------------------ */

function injectStyle() {
  if (document.getElementById('sc-style')) return;
  var s = document.createElement('style');
  s.id = 'sc-style';
  s.textContent = [
    '.sc-wrap{display:flex;flex-direction:column;gap:0.8rem;}',
    '.sc-flavor{color:var(--muted);font-size:0.9rem;line-height:1.5;padding:0.7rem 0.85rem;}',
    '.sc-flavor b{color:var(--text);}',
    '.sc-beam{width:100%;max-width:420px;margin:0 auto;display:block;}',
    '.sc-readout{text-align:center;font-size:0.9rem;color:var(--muted);font-variant-numeric:tabular-nums;min-height:1.3rem;}',
    '.sc-readout b{color:var(--text);}',
    '.sc-zones{display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;}',
    '.sc-zone{border:2px dashed var(--surface2);border-radius:12px;padding:0.6rem;min-height:84px;}',
    '.sc-zone.sc-bench{grid-column:1 / -1;border-style:solid;}',
    '.sc-zone .sc-zlab{font-size:0.74rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--dim);margin-bottom:0.45rem;}',
    '.sc-coins{display:flex;flex-wrap:wrap;gap:0.4rem;}',
    '.sc-coin{position:relative;min-width:44px;min-height:44px;border-radius:50%;border:2px solid var(--surface2);',
    '  background:var(--surface);color:var(--text);font-size:0.85rem;cursor:pointer;font-variant-numeric:tabular-nums;',
    '  transition:border-color .15s,opacity .2s,transform .1s;display:inline-flex;align-items:center;justify-content:center;}',
    '.sc-coin:hover{border-color:var(--blue);}',
    '.sc-coin:active{transform:scale(0.94);}',
    '.sc-coin.sc-sel{border-color:var(--yellow);color:var(--yellow);box-shadow:0 0 0 1px var(--yellow);}',
    '.sc-coin.sc-gone{opacity:0.28;cursor:default;border-style:dotted;}',
    '.sc-coin.sc-gone:hover{border-color:var(--surface2);}',
    '.sc-mk{position:absolute;top:-5px;right:-5px;width:18px;height:18px;border-radius:50%;font-size:0.68rem;',
    '  display:flex;align-items:center;justify-content:center;background:var(--bg);border:1px solid var(--border);pointer-events:none;}',
    '.sc-mk.sc-mk-clean{color:var(--green);border-color:var(--green);}',
    '.sc-mk.sc-mk-sus{color:var(--yellow);border-color:var(--yellow);}',
    '.sc-controls{display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:center;}',
    '.sc-controls .btn{min-height:44px;}',
    '.sc-hint{text-align:center;color:var(--yellow);font-size:0.85rem;min-height:1.1rem;}',
    '.sc-sub{font-size:0.78rem;letter-spacing:0.04em;text-transform:uppercase;color:var(--dim);}',
    '.sc-note{font-size:0.78rem;color:var(--muted);line-height:1.45;margin-top:0.35rem;}',
    '.sc-muted{color:var(--muted);}',
    '.sc-cand{display:flex;flex-wrap:wrap;gap:0.3rem;justify-content:center;}',
    '.sc-cand .sc-cc{font-size:0.78rem;color:var(--cyan);font-variant-numeric:tabular-nums;}',
    '.sc-pausebtn{display:flex;justify-content:center;}',
    '.sc-pausebtn .btn{min-height:44px;}',
    /* debrief outcome tree */
    '.sc-tree{font-size:0.82rem;line-height:1.5;font-variant-numeric:tabular-nums;}',
    '.sc-tree .sc-tw{color:var(--text);font-weight:600;margin-top:0.2rem;}',
    '.sc-tree .sc-tbr{margin-left:0.55rem;padding-left:0.6rem;border-left:2px solid var(--surface2);margin-top:0.15rem;}',
    '.sc-tree .sc-tbr.sc-took{border-left-color:var(--green);}',
    '.sc-tree .sc-tout{color:var(--muted);}',
    '.sc-tree .sc-tout b{color:var(--cyan);font-weight:600;}',
    '.sc-tree .sc-leaf{color:var(--green);font-weight:600;}'
  ].join('');
  document.head.appendChild(s);
}

// Build the inline SVG beam at a given tilt angle (deg). Pure string.
function beamSVG(tiltDeg) {
  var cx = 210, pivotY = 36, beamLen = 150, drop = 54;
  var rad = tiltDeg * Math.PI / 180;
  // left/right pan attach points rotate about pivot
  var lx = cx - beamLen * Math.cos(rad), ly = pivotY - beamLen * Math.sin(rad);
  var rx = cx + beamLen * Math.cos(rad), ry = pivotY + beamLen * Math.sin(rad);
  function pan(px, py, fill) {
    return '<line x1="' + px + '" y1="' + py + '" x2="' + px + '" y2="' + (py + drop) +
      '" stroke="var(--border)" stroke-width="2"/>' +
      '<path d="M' + (px - 28) + ' ' + (py + drop) + ' Q' + px + ' ' + (py + drop + 26) +
      ' ' + (px + 28) + ' ' + (py + drop) + ' Z" fill="' + fill + '" stroke="var(--border)" stroke-width="2"/>';
  }
  return '<svg class="sc-beam" viewBox="0 0 420 150" role="img" aria-label="balance beam">' +
    '<line x1="' + cx + '" y1="' + pivotY + '" x2="' + cx + '" y2="132" stroke="var(--surface2)" stroke-width="6" stroke-linecap="round"/>' +
    '<polygon points="' + (cx - 20) + ',132 ' + (cx + 20) + ',132 ' + cx + ',150" fill="var(--surface2)"/>' +
    '<line x1="' + lx + '" y1="' + ly + '" x2="' + rx + '" y2="' + ry + '" stroke="var(--blue)" stroke-width="6" stroke-linecap="round"/>' +
    '<circle cx="' + cx + '" cy="' + pivotY + '" r="6" fill="var(--blue)"/>' +
    pan(lx, ly, 'rgba(56,189,248,0.18)') +
    pan(rx, ry, 'rgba(56,189,248,0.18)') +
    '</svg>';
}

/* ------------------------------------------------------------------ */
/* mechanic                                                           */
/* ------------------------------------------------------------------ */

G.puzzles.register('scales', {
  title: 'The Harbor Scales',

  // exposed for _smoke/pz_test_scales.mjs (node, no browser)
  _logic: {
    applyWeighing: applyWeighing, predictTilt: predictTilt,
    pansValid: pansValid, ceilLog3: ceilLog3, pow3: pow3,
    splitSizes: splitSizes, worstCase: worstCase,
    certaintyLost: certaintyLost, canAccuse: canAccuse,
  },

  create: function (root, config, api) {
    injectStyle();

    var N = Math.max(2, config.coins || 9);
    var odd = (config.odd === 'heavy') ? 'heavy' : 'light';
    var need = ceilLog3(N);
    var K = Math.max(config.weighings || need, need); // never ship an unwinnable round

    var coins = [];
    for (var i = 0; i < N; i++) coins.push(i);

    var taught = G.pz.taught('scales');
    var totalRounds = taught ? 1 : 2;

    // direction words (light fake -> its pan RISES; heavy -> it SINKS)
    var blameWord = odd === 'light' ? 'rose' : 'sank';
    var rideLine = odd === 'light' ? 'a light fake rides high' : 'a heavy fake drags its pan down';

    var third = Math.max(1, Math.round(N / 3));
    var ladder = G.pz.hintLadder([
      // h1 — nudge the 3-way split
      'A weighing sorts the suspects into <b>three piles</b>: left pan, right pan, bench. ' +
      'The beam can only point at one pile — keep all three small enough to finish. ' +
      'Start with <b>' + third + ' · ' + third + ' · ' + (N - 2 * third) + '</b>.',
      // h2 — why 3v3 then 1v1
      'First weigh <b>' + third + ' v ' + third + '</b>. Level → the fake idles on the bench. ' +
      'A tilt → it is in the pan that <b>' + blameWord + '</b>. Three suspects either way. ' +
      'Then weigh two of them <b>1 v 1</b>: a tilt blames the pan that ' + blameWord +
      '; level blames the suspect you left off.',
      // h3 — walk it through
      'Step by step: put <b>#1…#' + third + '</b> on the left, <b>#' + (third + 1) + '…#' + (2 * third) +
      '</b> on the right, weigh. Keep the three coins the beam blames (the bench three if level). ' +
      'Weigh two of those <b>1 v 1</b>. If a pan ' + blameWord + ', accuse its coin; ' +
      'if level, accuse the suspect you kept off. Two weighings — one certain coin.',
    ]);

    // phase: 'hook' | 'play' | 'pause' | 'debrief';  round: 'guide' | 'mastery'
    var phase, round, pause = null;
    var fake, cands, weighsLeft, place, lastTilt, accuseSel, marks, log;
    var coachLine = null, currentHint = null, flash = '';
    var completed = false;

    function newRound() {
      fake = Math.min(N - 1, Math.floor(api.rng() * N));
      cands = coins.slice();
      weighsLeft = K;
      place = {};
      marks = {};
      coins.forEach(function (c) { place[c] = 'bench'; });
      lastTilt = null;
      accuseSel = null;
      log = [];
      flash = '';
    }

    var wrap = document.createElement('div');
    wrap.className = 'sc-wrap';
    root.appendChild(wrap);

    if (taught) { round = 'mastery'; newRound(); phase = 'play'; }
    else { round = 'guide'; newRound(); phase = 'hook'; }

    /* ---------------- text builders ---------------- */

    function setName(arr) { return arr.map(function (c) { return '#' + (c + 1); }).join(' '); }

    function narrate(entry) {
      var k = entry.after.length;
      var head;
      if (entry.tilt === 'balance') {
        head = 'Level — every coin on the beam is honest. The fake idles on the bench.';
      } else {
        var blamed = (odd === 'light')
          ? (entry.tilt === 'left' ? 'right' : 'left')   // the pan that rose
          : entry.tilt;                                   // the pan that sank
        head = 'The <b>' + blamed + '</b> pan ' + blameWord + ' — ' + rideLine + '.';
      }
      if (k === 1) {
        return head + ' One suspect stands alone: <b>' + setName(entry.after) +
          '</b>. Now you may accuse with <b>certainty</b>.';
      }
      return head + ' The ledger crosses the rest off — <b>' + k + '</b> suspects remain (' +
        setName(entry.after) + '), <b>' + weighsLeft + '</b> weighing' +
        (weighsLeft === 1 ? '' : 's') + ' left.';
    }

    function interruptHtml(wc, remAfter, actualAfter) {
      var cap = pow3(remAfter), counting;
      if (remAfter === 0) {
        counting = '<b>' + wc + '</b> suspects could share one outcome — and no weighings remain. ' +
          'Certainty needs exactly <b>one</b> suspect at the end.';
      } else {
        counting = '<b>' + wc + '</b> suspects, ' + remAfter + ' weighing' +
          (remAfter === 1 ? '' : 's') + ' left, three outcomes' + (remAfter > 1 ? ' each' : '') +
          ' — that tells apart at most <b>' + cap + '</b>. ' + wc + ' &gt; ' + cap +
          ': certainty is gone.';
      }
      if (actualAfter <= cap) {
        return 'The beam was kind — but luck is not certainty. Had it gone the other way: ' +
          counting + ' Plan for the <b>worst</b> branch. Start over — fresh coins.';
      }
      return 'Hold. ' + counting + ' Start over — fresh coins.';
    }

    function guessHtml(k) {
      return 'An accusation before certainty is a <b>guess</b> — <b>' + k +
        '</b> coins could still be the fake. The harbor does not pay out on guesses. Fresh coins.';
    }

    function wrongHtml() {
      return 'The beam never blamed that coin — the tilts pointed elsewhere. ' +
        'Fresh coins; this time follow the beam, not a hunch.';
    }

    function outOfHtml(k) {
      return 'Out of weighings with <b>' + k + '</b> suspects still standing. ' +
        'The ferry sails on certainty, not odds. Fresh coins.';
    }

    function guideWinHtml() {
      return 'Caught — and you were <b>certain</b>, not lucky. Round two: fresh coins, ' +
        'and the ledger is yours to keep. Pencil-mark the coins if it helps; the beam ignores notes.';
    }

    /* ---------------- helpers ---------------- */

    function pansFromPlace() {
      var L = [], R = [];
      coins.forEach(function (c) {
        if (round === 'guide' && cands.indexOf(c) < 0) return; // eliminated coins left the scale
        if (place[c] === 'left') L.push(c);
        else if (place[c] === 'right') R.push(c);
      });
      return { L: L, R: R };
    }

    function tiltDeg() {
      if (lastTilt === 'left') return -11;
      if (lastTilt === 'right') return 11;
      return 0;
    }

    function roundNo() { return (round === 'guide') ? 1 : totalRounds; }

    function pushStatus() {
      var s = 'round ' + roundNo() + '/' + totalRounds + ' · weighings left: ' + weighsLeft;
      if (round === 'guide') s += ' · suspects: ' + cands.length;
      api.status(s);
    }

    /* ---------------- actions ---------------- */

    function failTo(html, hintToo) {
      if (hintToo) { var h = ladder.fail(); if (h) currentHint = h; }
      pause = { html: html, btn: 'Fresh coins', act: 'reset' };
      phase = 'pause';
      coachLine = null;
      api.fail();
      render();
    }

    function doWeigh() {
      if (phase !== 'play' || weighsLeft <= 0) return;
      var p = pansFromPlace();
      if (!pansValid(p.L, p.R)) {
        flash = p.L.length !== p.R.length
          ? 'The pans must hold equal numbers of coins.'
          : 'Put at least one coin in each pan.';
        api.sfx('bump');
        render();
        return;
      }
      var before = cands.slice();
      var tilt = predictTilt(fake, p.L, p.R, odd);
      var after = applyWeighing(cands, p.L, p.R, tilt, odd);
      var remAfter = weighsLeft - 1;
      var lost = certaintyLost(before, p.L, p.R, remAfter);
      weighsLeft--;
      lastTilt = tilt;
      cands = after;
      log.push({ left: p.L.slice(), right: p.R.slice(), before: before, tilt: tilt, after: after.slice() });
      coins.forEach(function (c) { place[c] = 'bench'; });
      accuseSel = null;
      flash = '';
      if (lost) {                       // THE key beat: certainty destroyed -> Shannon interrupts
        failTo(interruptHtml(worstCase(before, p.L, p.R), remAfter, after.length), true);
        return;
      }
      if (cands.length > 1 && weighsLeft === 0) {  // safety net (only reachable on doomed configs)
        failTo(outOfHtml(cands.length), true);
        return;
      }
      api.sfx(tilt === 'balance' ? 'select' : 'zap');
      coachLine = (round === 'guide') ? narrate(log[log.length - 1]) : null;
      render();
    }

    function doAccuse(c) {
      if (phase !== 'play') return;
      if (!canAccuse(cands)) {          // early accusation = guess (even if it happens to be right)
        failTo(guessHtml(cands.length), true);
        return;
      }
      if (c !== cands[0]) {             // mistracked in mastery
        failTo(wrongHtml(), true);
        return;
      }
      // forced, correct accusation — the gate
      ladder.reset();
      currentHint = null;
      coachLine = null;
      api.sfx('spark');
      if (round === 'guide') {
        pause = { html: guideWinHtml(), btn: 'Round 2 — no ledger', act: 'mastery' };
        phase = 'pause';
        render();
      } else {
        G.pz.markTaught('scales');
        phase = 'debrief';
        render();
      }
    }

    function pauseGo() {
      if (!pause) return;
      if (pause.act === 'mastery') round = 'mastery';
      newRound();
      pause = null;
      phase = 'play';
      render();
    }

    /* ---------------- render ---------------- */

    function render() {
      wrap.innerHTML = '';
      wrap.setAttribute('data-sc-phase', phase);
      wrap.setAttribute('data-sc-round', round);

      if (phase === 'hook') { api.status('predict first'); renderHook(); return; }
      pushStatus();

      wrap.appendChild(G.pz.roundBanner(roundNo(), totalRounds,
        round === 'guide' ? 'guided — Shannon keeps the ledger' : 'mastery — the ledger is yours'));

      if (phase === 'debrief') { renderDebrief(); return; }

      // flavor
      var flav = document.createElement('div');
      flav.className = 'sc-flavor g-card';
      flav.innerHTML = (round === 'guide')
        ? '<b>' + N + '</b> coins — one is <b>' + odd + '</b>, the rest honest. Catch it in ≤ <b>' +
          K + '</b> weighings, then accuse only when you are <i>certain</i>. ' +
          '<span class="sc-muted">The beam has three answers: left, right, level.</span>'
        : 'Fresh coins, same job: ≤ <b>' + K + '</b> weighings and a <i>certain</i> accusation. ' +
          '<span class="sc-muted">No ledger this time — the suspects live in your head.</span>';
      wrap.appendChild(flav);

      // beam
      var beamHost = document.createElement('div');
      beamHost.innerHTML = beamSVG(tiltDeg());
      wrap.appendChild(beamHost);

      // readout
      var readout = document.createElement('div');
      readout.className = 'sc-readout';
      readout.setAttribute('data-sc-tilt', lastTilt || '');
      var tiltLine = lastTilt
        ? 'Last weighing: <b>' + (lastTilt === 'balance' ? 'balanced' : (lastTilt + ' pan dropped')) + '</b> · '
        : '';
      readout.innerHTML = tiltLine + 'weighings left: <b>' + weighsLeft + '</b>' +
        (round === 'guide' ? ' · suspects: <b>' + cands.length + '</b>' : '');
      wrap.appendChild(readout);

      if (phase === 'pause') {
        wrap.appendChild(G.pz.coachCard('shannon', pause.html));
        var row = document.createElement('div');
        row.className = 'sc-pausebtn';
        var go = document.createElement('button');
        go.className = 'btn btn-primary';
        go.type = 'button';
        go.setAttribute('data-sc-act', 'continue');
        go.textContent = pause.btn;
        go.addEventListener('click', pauseGo);
        row.appendChild(go);
        wrap.appendChild(row);
        return;
      }

      // GUIDE only: the suspect ledger
      if (round === 'guide' && cands.length < N) {
        var cstrip = document.createElement('div');
        cstrip.className = 'sc-cand';
        var cc = document.createElement('span');
        cc.className = 'sc-cc';
        cc.textContent = 'still suspect: ' + setName(cands);
        cstrip.appendChild(cc);
        wrap.appendChild(cstrip);
      }

      // coach cards (max 2: narration + hint)
      if (coachLine) wrap.appendChild(G.pz.coachCard('shannon', coachLine));
      if (currentHint) wrap.appendChild(G.pz.coachCard('shannon', '<b>Hint.</b> ' + currentHint));

      // pans + bench
      var zones = document.createElement('div');
      zones.className = 'sc-zones';
      zones.appendChild(zone('left', 'Left pan'));
      zones.appendChild(zone('right', 'Right pan'));
      zones.appendChild(zone('bench', 'Bench'));
      wrap.appendChild(zones);

      // flash line
      var hl = document.createElement('div');
      hl.className = 'sc-hint';
      hl.textContent = flash || '';
      wrap.appendChild(hl);

      // controls
      var ctrl = document.createElement('div');
      ctrl.className = 'sc-controls';
      var weighBtn = document.createElement('button');
      weighBtn.className = 'btn btn-primary';
      weighBtn.type = 'button';
      weighBtn.setAttribute('data-sc-act', 'weigh');
      weighBtn.textContent = 'Weigh';
      weighBtn.disabled = weighsLeft <= 0;
      weighBtn.addEventListener('click', doWeigh);
      ctrl.appendChild(weighBtn);
      var clearBtn = document.createElement('button');
      clearBtn.className = 'btn';
      clearBtn.type = 'button';
      clearBtn.setAttribute('data-sc-act', 'clear');
      clearBtn.textContent = 'Clear pans';
      clearBtn.addEventListener('click', function () {
        coins.forEach(function (c) { place[c] = 'bench'; });
        flash = '';
        render();
      });
      ctrl.appendChild(clearBtn);
      wrap.appendChild(ctrl);

      wrap.appendChild(accuseCard());
    }

    // a placement zone (left/right pan, bench) with its coins as movable chips
    function zone(kind, label) {
      var z = document.createElement('div');
      z.className = 'sc-zone' + (kind === 'bench' ? ' sc-bench' : '');
      var zl = document.createElement('div');
      zl.className = 'sc-zlab';
      var inZone = coins.filter(function (c) {
        if (round === 'guide' && cands.indexOf(c) < 0) return kind === 'bench'; // eliminated rest on the bench
        return place[c] === kind;
      });
      var live = inZone.filter(function (c) { return round !== 'guide' || cands.indexOf(c) >= 0; });
      zl.textContent = label + ' (' + live.length + ')';
      z.appendChild(zl);
      var cwrap = document.createElement('div');
      cwrap.className = 'sc-coins';
      inZone.forEach(function (c) {
        var gone = round === 'guide' && cands.indexOf(c) < 0;
        var b = coinBtn(c, gone, false);
        if (!gone) {
          b.setAttribute('data-sc-chip', c);
          // click cycles bench -> left -> right -> bench
          b.addEventListener('click', function () {
            place[c] = (place[c] === 'bench') ? 'left'
              : (place[c] === 'left') ? 'right' : 'bench';
            flash = '';
            render();
          });
        }
        cwrap.appendChild(b);
      });
      if (live.length === 0 && inZone.length === 0) {
        var empty = document.createElement('span');
        empty.className = 'sc-muted';
        empty.style.fontSize = '0.8rem';
        empty.textContent = kind === 'bench' ? '(coins rest here)' : '(tap a coin to add)';
        z.appendChild(empty);
      }
      z.appendChild(cwrap);
      return z;
    }

    function coinBtn(c, gone, sel) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sc-coin' + (gone ? ' sc-gone' : '') + (sel ? ' sc-sel' : '');
      b.textContent = (c + 1);
      if (round === 'mastery' && marks[c]) {
        var mk = document.createElement('span');
        mk.className = 'sc-mk ' + (marks[c] === 'clean' ? 'sc-mk-clean' : 'sc-mk-sus');
        mk.textContent = marks[c] === 'clean' ? '✓' : '?';
        b.appendChild(mk);
      }
      return b;
    }

    function tapAccuseCoin(c) {
      if (round === 'guide') {
        if (cands.indexOf(c) < 0) return;
        accuseSel = (accuseSel === c) ? null : c;
      } else if (accuseSel !== c) {
        accuseSel = c;                        // first tap: choose
      } else {                                 // tap again: cycle the pencil mark
        var m = marks[c] || null;
        if (m === null) marks[c] = 'clean';
        else if (m === 'clean') marks[c] = 'sus';
        else { marks[c] = null; accuseSel = null; }
      }
      flash = '';
      render();
    }

    function accuseCard() {
      var acard = document.createElement('div');
      acard.className = 'g-card';
      var alab = document.createElement('div');
      alab.className = 'sc-sub';
      alab.style.marginBottom = '0.5rem';
      alab.textContent = 'The accusation';
      acard.appendChild(alab);

      var acoins = document.createElement('div');
      acoins.className = 'sc-coins';
      coins.forEach(function (c) {
        var gone = round === 'guide' && cands.indexOf(c) < 0;
        var b = coinBtn(c, gone, accuseSel === c);
        if (!gone) {
          b.setAttribute('data-sc-coin', c);
          b.addEventListener('click', function () { tapAccuseCoin(c); });
        }
        acoins.appendChild(b);
      });
      acard.appendChild(acoins);

      var note = document.createElement('div');
      note.className = 'sc-note';
      note.innerHTML = (round === 'mastery')
        ? 'Tap a coin to choose it · tap it again to pencil-mark it (<b style="color:var(--green)">✓</b> honest, ' +
          '<b style="color:var(--yellow)">?</b> suspect — notes are yours; the beam ignores them).<br>' +
          'Certainty unlocks the accusation — accusing on a hunch resets the coins.'
        : 'Accuse only when <b>one</b> suspect remains — an early accusation is a guess, and guesses reset the coins.';
      acard.appendChild(note);

      var accuseBtn = document.createElement('button');
      accuseBtn.className = 'btn btn-danger';
      accuseBtn.type = 'button';
      accuseBtn.style.marginTop = '0.6rem';
      accuseBtn.style.minHeight = '44px';
      accuseBtn.setAttribute('data-sc-act', 'accuse');
      accuseBtn.textContent = accuseSel == null ? 'Accuse…' : 'Accuse coin #' + (accuseSel + 1);
      accuseBtn.disabled = accuseSel == null;
      accuseBtn.addEventListener('click', function () {
        if (accuseSel != null) doAccuse(accuseSel);
      });
      acard.appendChild(accuseBtn);
      return acard;
    }

    /* ---------------- hook ---------------- */

    function renderHook() {
      var flav = document.createElement('div');
      flav.className = 'sc-flavor g-card';
      flav.innerHTML = 'The ballast scales. <b>' + N + '</b> coins, one shaved <b>' + odd +
        '</b>. No ferry sails on crooked ballast — and no harbor pays out on guesses.';
      wrap.appendChild(flav);

      wrap.appendChild(G.pz.hookCard({
        question: N + ' coins, one ' + odd + '. How many weighings on the beam to be CERTAIN of the fake?',
        options: [
          { label: String(need) },
          { label: String(need + 1) },
          { label: String(need + 2) },
        ],
        correct: 0,
        reveal: 'A weighing has <b>three</b> outcomes — left drops, right drops, balance — so it answers a ' +
          '<b>3-way</b> question. At best it cuts the suspects to a third: ' +
          new Array(need + 1).join('3 × ').slice(0, -3) + ' = ' + pow3(need) + ' ≥ ' + N +
          ' — <b>' + need + '</b> weighings can tell every story apart. Fewer never can.',
        onDone: function () {
          phase = 'play';
          round = 'guide';
          newRound();
          coachLine = 'I’ll keep the suspect ledger this round — watch what each tilt erases. ' +
            'Mind the budget: <b>' + K + '</b> weighings, then a certain accusation.';
          render();
        },
      }));
    }

    /* ---------------- debrief ---------------- */

    function treeHTML() {
      function node(i) {
        var e = log[i];
        var html = '<div class="sc-tw">Weighing ' + (i + 1) + ': ⟨' + setName(e.left) +
          '⟩ ⚖ ⟨' + setName(e.right) + '⟩</div>';
        ['left', 'balance', 'right'].forEach(function (out) {
          var surv = applyWeighing(e.before, e.left, e.right, out, odd);
          var took = (out === e.tilt);
          html += '<div class="sc-tbr' + (took ? ' sc-took' : '') + '"><span class="sc-tout">' +
            (out === 'balance' ? 'level' : out + ' ↓') + ' → <b>' +
            (surv.length ? setName(surv) : '∅') + '</b>' + (took ? ' ◀ yours' : '') + '</span>';
          if (took) {
            if (i + 1 < log.length) html += node(i + 1);
            else html += '<div class="sc-leaf">accused ' + setName([fake]) + ' ✓</div>';
          }
          html += '</div>';
        });
        return html;
      }
      var leaves = new Array(log.length + 1).join('3 × ').slice(0, -3);
      return '<div class="sc-tree">' + node(0) +
        '<div class="sc-muted" style="margin-top:0.45rem">' + leaves + ' = ' + pow3(log.length) +
        ' leaves — enough for ' + N + ' coins. Your path is the green one.</div></div>';
    }

    function renderDebrief() {
      var fmt = G.pz.fmt, lg2 = G.pz.log2;
      var used = log.length;
      var eq = '<div class="pzk-eq" style="margin-top:0.55rem">3<sup>' + used + '</sup> = ' + pow3(used) +
        ' ≥ ' + N + ' · the beam speaks base 3: log₂3 ≈ 1.58 bits per weighing · ' +
        used + ' × 1.58 = ' + fmt(used * lg2(3)) + ' ≥ log₂' + N + ' = ' + fmt(lg2(N)) + ' bits needed.</div>';
      var half = Math.floor(N / 2);
      var cf = (half > pow3(Math.max(0, K - 1)))
        ? '<div class="sc-muted" style="margin-top:0.4rem">The lazy start — ' + half + ' v ' + half +
          ' — risks a branch of ' + half + ' suspects: more than the ' + pow3(K - 1) +
          ' stories one remaining weighing can tell. That plan was never certain.</div>'
        : '';
      wrap.appendChild(G.pz.debriefCard({
        title: 'Certain in ' + used + ' — the beam speaks base three',
        html: treeHTML() + eq + cf,
        buttonLabel: 'Take the ledger',
        tone: 'win',
        onButton: function () {
          if (completed) return;
          completed = true;
          api.complete();
        },
      }));
    }

    render();

    return {
      destroy: function () { /* element listeners die with the DOM; no timers */ }
    };
  }
});

})();
