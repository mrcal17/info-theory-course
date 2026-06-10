/* THE QUIET ARCHIPELAGO — 'scales' puzzle.
   The harbor's balance scale. N look-alike coins; one is fake with a KNOWN
   direction (odd:'light'|'heavy'). Find it in <= K weighings. Drag/click coins
   into LEFT pan / RIGHT pan / bench; press WEIGH; the beam tilts. The puzzle
   tracks the candidate set implied by the results. Accuse anytime: right ->
   complete, wrong -> fail + gentle reset. Out of weighings -> must accuse.

   Contract: js/core/overlay.js (create(root, config, api); api = {complete,
   fail, close, sfx, status, rng}). Config: { coins:n, odd, weighings:k } */
(function () {
'use strict';

/* ------------------------------------------------------------------ */
/* pure logic (testable; mirrored in scratch test)                    */
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

/* ------------------------------------------------------------------ */
/* one-time style                                                     */
/* ------------------------------------------------------------------ */

function injectStyle() {
  if (document.getElementById('sc-style')) return;
  var s = document.createElement('style');
  s.id = 'sc-style';
  s.textContent = [
    '.sc-wrap{display:flex;flex-direction:column;gap:0.8rem;}',
    '.sc-flavor{color:var(--muted);font-size:0.9rem;line-height:1.5;}',
    '.sc-beam{width:100%;max-width:420px;margin:0 auto;display:block;}',
    '.sc-readout{text-align:center;font-size:0.9rem;color:var(--muted);font-variant-numeric:tabular-nums;min-height:1.3rem;}',
    '.sc-readout b{color:var(--text);}',
    '.sc-zones{display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;}',
    '.sc-zone{border:2px dashed var(--surface2);border-radius:12px;padding:0.6rem;min-height:84px;}',
    '.sc-zone.sc-bench{grid-column:1 / -1;border-style:solid;}',
    '.sc-zone .sc-zlab{font-size:0.74rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--dim);margin-bottom:0.45rem;}',
    '.sc-coins{display:flex;flex-wrap:wrap;gap:0.4rem;}',
    '.sc-coin{min-width:44px;min-height:44px;border-radius:50%;border:2px solid var(--surface2);',
    '  background:var(--surface);color:var(--text);font-size:0.85rem;cursor:pointer;font-variant-numeric:tabular-nums;',
    '  transition:border-color .15s,opacity .2s,transform .1s;display:inline-flex;align-items:center;justify-content:center;}',
    '.sc-coin:hover{border-color:var(--blue);}',
    '.sc-coin:active{transform:scale(0.94);}',
    '.sc-coin.sc-sel{border-color:var(--yellow);color:var(--yellow);box-shadow:0 0 0 1px var(--yellow);}',
    '.sc-coin.sc-gone{opacity:0.28;cursor:default;border-style:dotted;}',
    '.sc-coin.sc-gone:hover{border-color:var(--surface2);}',
    '.sc-controls{display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:center;}',
    '.sc-controls .btn{min-height:44px;}',
    '.sc-hint{text-align:center;color:var(--yellow);font-size:0.85rem;min-height:1.1rem;}',
    '.sc-sub{font-size:0.78rem;letter-spacing:0.04em;text-transform:uppercase;color:var(--dim);}',
    '.sc-end{text-align:center;display:flex;flex-direction:column;gap:0.8rem;align-items:center;}',
    '.sc-end .sc-lesson{font-size:1rem;line-height:1.55;max-width:46ch;}',
    '.sc-muted{color:var(--muted);}',
    '.sc-cand{display:flex;flex-wrap:wrap;gap:0.3rem;justify-content:center;}',
    '.sc-cand .sc-cc{font-size:0.78rem;color:var(--cyan);font-variant-numeric:tabular-nums;}'
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
  create: function (root, config, api) {
    injectStyle();

    var N = Math.max(2, config.coins || 9);
    var odd = (config.odd === 'heavy') ? 'heavy' : 'light';
    var K = config.weighings || ceilLog3(N);
    var need = ceilLog3(N);

    var coins = [];
    for (var i = 0; i < N; i++) coins.push(i);

    var fake, cands, weighsLeft, place, lastTilt, finished, hint, accuseSel;

    function resetRound(announce) {
      fake = Math.min(N - 1, Math.floor(api.rng() * N));
      cands = coins.slice();           // still-possible fakes
      weighsLeft = K;
      place = {};                      // coin -> 'left'|'right'|'bench'
      coins.forEach(function (c) { place[c] = 'bench'; });
      lastTilt = null;
      hint = '';
      accuseSel = null;
      finished = false;
      render();
      if (announce && G.ui && G.ui.toast) G.ui.toast('Fresh coins clink onto the bench.');
    }

    function pushStatus() {
      api.status('weighings left: ' + weighsLeft + ' · candidates: ' + cands.length);
    }

    var wrap = document.createElement('div');
    wrap.className = 'sc-wrap';
    root.appendChild(wrap);

    function pans() {
      var L = [], R = [];
      coins.forEach(function (c) {
        if (cands.indexOf(c) < 0) return;       // eliminated coins stay off the scale
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

    function render() {
      pushStatus();
      wrap.innerHTML = '';

      var flav = document.createElement('div');
      flav.className = 'sc-flavor g-card';
      flav.innerHTML =
        N + ' coins, one is <b>' + odd + '</b> — the rest are honest. Find it with the ' +
        'beam. <span class="sc-muted">One weighing has 3 outcomes — at most ' +
        'log₂3 ≈ <b>1.58</b> bits. So <b>⌈log₃' + N + '⌉ = ' + need +
        '</b> weighings are enough.</span>';
      wrap.appendChild(flav);

      // beam
      var beamHost = document.createElement('div');
      beamHost.innerHTML = beamSVG(tiltDeg());
      wrap.appendChild(beamHost);

      if (finished) { renderEnd(); return; }

      // readout
      var readout = document.createElement('div');
      readout.className = 'sc-readout';
      var tiltLine = lastTilt
        ? 'Last weighing: <b>' + (lastTilt === 'balance' ? 'balanced' :
            (lastTilt + ' pan dropped')) + '</b>. '
        : '';
      readout.innerHTML = tiltLine + 'candidates left: <b>' + cands.length + '</b>' +
        '  ·  weighings left: <b>' + weighsLeft + '</b>';
      wrap.appendChild(readout);

      // candidate strip
      if (cands.length < N) {
        var cstrip = document.createElement('div');
        cstrip.className = 'sc-cand';
        var cc = document.createElement('span');
        cc.className = 'sc-cc';
        cc.textContent = 'still suspect: ' + cands.map(function (c) { return '#' + (c + 1); }).join(' ');
        cstrip.appendChild(cc);
        wrap.appendChild(cstrip);
      }

      // pans + bench
      var zones = document.createElement('div');
      zones.className = 'sc-zones';
      zones.appendChild(zone('left', 'Left pan'));
      zones.appendChild(zone('right', 'Right pan'));
      zones.appendChild(zone('bench', 'Bench'));
      wrap.appendChild(zones);

      // hint line
      var hl = document.createElement('div');
      hl.className = 'sc-hint';
      hl.textContent = hint || '';
      wrap.appendChild(hl);

      // controls
      var ctrl = document.createElement('div');
      ctrl.className = 'sc-controls';

      var weighBtn = document.createElement('button');
      weighBtn.className = 'btn btn-primary';
      weighBtn.type = 'button';
      weighBtn.textContent = 'Weigh';
      weighBtn.disabled = weighsLeft <= 0;
      weighBtn.addEventListener('click', doWeigh);
      ctrl.appendChild(weighBtn);

      var clearBtn = document.createElement('button');
      clearBtn.className = 'btn';
      clearBtn.type = 'button';
      clearBtn.textContent = 'Clear pans';
      clearBtn.addEventListener('click', function () {
        coins.forEach(function (c) { place[c] = 'bench'; });
        hint = '';
        render();
      });
      ctrl.appendChild(clearBtn);

      wrap.appendChild(ctrl);

      // accuse area
      var acard = document.createElement('div');
      acard.className = 'g-card';
      var alab = document.createElement('div');
      alab.className = 'sc-sub';
      alab.style.marginBottom = '0.5rem';
      alab.textContent = weighsLeft > 0
        ? 'Accuse a coin (tap a suspect, then Accuse)'
        : 'Out of weighings — you must accuse a suspect';
      acard.appendChild(alab);

      var acoins = document.createElement('div');
      acoins.className = 'sc-coins';
      coins.forEach(function (c) {
        var gone = cands.indexOf(c) < 0;
        var b = document.createElement('button');
        b.className = 'sc-coin' + (gone ? ' sc-gone' : '') + (accuseSel === c ? ' sc-sel' : '');
        b.type = 'button';
        b.textContent = (c + 1);
        if (!gone) {
          b.addEventListener('click', function () {
            accuseSel = (accuseSel === c) ? null : c;
            hint = '';
            render();
          });
        }
        acoins.appendChild(b);
      });
      acard.appendChild(acoins);

      var accuseBtn = document.createElement('button');
      accuseBtn.className = 'btn btn-danger';
      accuseBtn.type = 'button';
      accuseBtn.style.marginTop = '0.6rem';
      accuseBtn.style.minHeight = '44px';
      accuseBtn.textContent = accuseSel == null ? 'Accuse…' : 'Accuse coin #' + (accuseSel + 1);
      accuseBtn.disabled = accuseSel == null;
      accuseBtn.addEventListener('click', function () {
        if (accuseSel != null) doAccuse(accuseSel);
      });
      acard.appendChild(accuseBtn);

      wrap.appendChild(acard);
    }

    // a placement zone (left/right pan, bench) with its coins as movable chips
    function zone(kind, label) {
      var z = document.createElement('div');
      z.className = 'sc-zone' + (kind === 'bench' ? ' sc-bench' : '');
      var zl = document.createElement('div');
      zl.className = 'sc-zlab';
      var inZone = coins.filter(function (c) { return cands.indexOf(c) >= 0 && place[c] === kind; });
      zl.textContent = label + ' (' + inZone.length + ')';
      z.appendChild(zl);
      var cwrap = document.createElement('div');
      cwrap.className = 'sc-coins';
      inZone.forEach(function (c) {
        var b = document.createElement('button');
        b.className = 'sc-coin';
        b.type = 'button';
        b.textContent = (c + 1);
        // click cycles bench -> left -> right -> bench
        b.addEventListener('click', function () {
          place[c] = (place[c] === 'bench') ? 'left'
            : (place[c] === 'left') ? 'right' : 'bench';
          hint = '';
          render();
        });
        cwrap.appendChild(b);
      });
      if (inZone.length === 0) {
        var empty = document.createElement('span');
        empty.className = 'sc-muted';
        empty.style.fontSize = '0.8rem';
        empty.textContent = kind === 'bench' ? '(suspects rest here)' : '(tap a coin to add)';
        z.appendChild(empty);
      }
      z.appendChild(cwrap);
      return z;
    }

    function doWeigh() {
      if (finished || weighsLeft <= 0) return;
      var p = pans();
      if (!pansValid(p.L, p.R)) {
        hint = p.L.length !== p.R.length
          ? 'The pans must hold equal numbers of coins.'
          : 'Put at least one coin in each pan.';
        api.sfx('bump');
        render();
        return;
      }
      var tilt = predictTilt(fake, p.L, p.R, odd);
      cands = applyWeighing(cands, p.L, p.R, tilt, odd);
      weighsLeft--;
      lastTilt = tilt;
      accuseSel = null;
      hint = '';
      // reset placement so the player composes the next weighing fresh
      coins.forEach(function (c) { place[c] = 'bench'; });
      api.sfx(tilt === 'balance' ? 'select' : 'zap');
      render();
    }

    function doAccuse(c) {
      if (finished) return;
      if (c === fake) {
        finished = true;
        render();
        api.complete();
      } else {
        api.fail('That coin is honest.');
        resetRound(true);
      }
    }

    function renderEnd() {
      var end = document.createElement('div');
      end.className = 'sc-end g-card';
      var used = K - weighsLeft;
      var lesson = document.createElement('div');
      lesson.className = 'sc-lesson';
      lesson.innerHTML = 'Coin <b style="color:var(--green)">#' + (fake + 1) +
        '</b> was the ' + odd + ' one — caught in <b>' + used + '</b> weighing' +
        (used === 1 ? '' : 's') + '.<br><span class="sc-muted">⌈log₃' + N + '⌉ = ' +
        need + ' weighings are enough — and necessary. Three outcomes per weighing, ' +
        'log₂3 ≈ 1.58 bits each.</span>';
      end.appendChild(lesson);
      // note: complete() already fired from doAccuse; this card shows briefly.
      wrap.appendChild(end);
    }

    resetRound(false);

    return {
      destroy: function () { /* element listeners die with the DOM; no timers */ }
    };
  }
});

})();
