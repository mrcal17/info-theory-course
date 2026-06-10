/* THE QUIET ARCHIPELAGO — stamp-carver puzzle.
   Lem & Ziv's corridor: compression by dictionary. Select substrings of the
   glyph pattern as STAMPS (cost = length), then tile the corridor left-to-right
   reusing stamps (cost = 1 press each) or chiselling literals. The second time
   a pattern appears, a stamp turns it into a single press — that is LZ.
   When the pattern is random, no repeats exist: pull the lever. */
(function () {
'use strict';

/* ---------------- pure logic (tested in scratch) ----------------
   Cost model (simple + visible):
     total = Σ (length of each carved stamp)   [carving]
           + number of presses                  [tiling]
   A press = applying one stamp OR chiselling one literal glyph.
   Greedy tiling: at the current position, apply the LONGEST stamp that
   matches exactly here; if none, chisel one literal glyph. */
function matchesAt(pattern, pos, stamp) {
  if (!stamp) return false;
  if (pos + stamp.length > pattern.length) return false;
  return pattern.substr(pos, stamp.length) === stamp;
}
function greedyTile(pattern, stamps) {
  var pos = 0, presses = 0, ops = [];
  while (pos < pattern.length) {
    var best = null;
    for (var i = 0; i < stamps.length; i++) {
      if (stamps[i] && matchesAt(pattern, pos, stamps[i])) {
        if (!best || stamps[i].length > best.length) best = stamps[i];
      }
    }
    if (best) { ops.push({ stamp: best, at: pos, len: best.length }); pos += best.length; presses++; }
    else { ops.push({ lit: pattern.charAt(pos), at: pos, len: 1 }); pos += 1; presses++; }
  }
  return { presses: presses, ops: ops };
}
function carveCost(stamps) {
  var c = 0;
  for (var i = 0; i < stamps.length; i++) c += stamps[i].length;
  return c;
}
function planCost(stamps, presses) { return carveCost(stamps) + presses; }

/* ---------------- style (once) ---------------- */
var STYLE_ID = 'st-style';
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  var s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = [
    '.st-wrap{display:flex;flex-direction:column;gap:.8rem;}',
    '.st-flav{font-size:.82rem;color:var(--muted);line-height:1.5;font-style:italic;}',
    '.st-flav b{color:var(--text);font-style:normal;}',
    '.st-corr{display:flex;flex-wrap:wrap;gap:4px;padding:.6rem;background:#10182c;',
    '  border:1px solid var(--surface2);border-radius:10px;}',
    '.st-tile{min-width:40px;min-height:40px;display:flex;align-items:center;justify-content:center;',
    '  font-family:ui-monospace,Menlo,Consolas,monospace;font-size:1.15rem;font-weight:700;',
    '  background:var(--surface);border:2px solid var(--surface2);border-radius:8px;color:var(--text);',
    '  cursor:pointer;-webkit-user-select:none;user-select:none;transition:.12s;}',
    '.st-tile.sel{border-color:var(--purple);color:var(--purple);background:#241b3a;}',
    '.st-tile.tiled{opacity:.85;border-color:#2c3a52;}',
    '.st-tile.cursor{border-color:var(--cyan);box-shadow:0 0 0 2px rgba(34,211,238,.35);}',
    '.st-tile.lit{background:#2a2030;border-color:var(--orange);}',
    '.st-tile.g0{border-bottom-color:var(--blue);}',
    '.st-tile.g1{border-bottom-color:var(--green);}',
    '.st-tile.g2{border-bottom-color:var(--pink);}',
    '.st-tile.g3{border-bottom-color:var(--yellow);}',
    '.st-tile.g4{border-bottom-color:var(--cyan);}',
    '.st-rack{display:flex;flex-wrap:wrap;gap:.5rem;min-height:48px;align-items:center;}',
    '.st-stamp{display:flex;align-items:center;gap:.4rem;padding:.3rem .55rem;border-radius:8px;',
    '  border:2px solid var(--purple);background:#1c1730;min-height:40px;cursor:pointer;}',
    '.st-stamp:hover{background:#241b3a;}',
    '.st-stamp .glyphs{font-family:ui-monospace,Consolas,monospace;font-weight:700;color:var(--purple);}',
    '.st-stamp .cost{font-size:.7rem;color:var(--muted);}',
    '.st-stamp .x{color:var(--dim);font-size:.8rem;padding-left:.2rem;}',
    '.st-empty{font-size:.8rem;color:var(--dim);}',
    '.st-ops{display:flex;flex-wrap:wrap;gap:4px;min-height:26px;}',
    '.st-op{font-size:.7rem;padding:.1rem .4rem;border-radius:6px;background:var(--surface2);color:var(--muted);}',
    '.st-op.stamp{background:#241b3a;color:var(--purple);}',
    '.st-op.lit{background:#2a2030;color:var(--orange);}',
    '.st-meter{font-size:.85rem;}',
    '.st-meter .nums{display:flex;gap:1rem;flex-wrap:wrap;margin:.2rem 0 .35rem;}',
    '.st-meter .n b{font-size:1.1rem;}',
    '.st-good{color:var(--green);}.st-bad{color:var(--red);}',
    '.st-tgt{color:var(--cyan);}',
    '.st-arith{font-family:ui-monospace,Consolas,monospace;font-size:.78rem;color:var(--muted);}',
    '.st-arith b{color:var(--text);}',
    '.st-row{display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;}',
    '.st-lever{display:flex;align-items:center;gap:.6rem;padding:.7rem;border-radius:10px;',
    '  border:2px dashed var(--red);background:#2a1518;}',
    '.st-lever .btn{border-color:var(--red);color:var(--red);}',
    '.st-lesson{font-size:.9rem;line-height:1.5;}.st-lesson b{color:var(--cyan);}',
    '.st-hint{font-size:.78rem;color:var(--dim);}'
  ].join('');
  document.head.appendChild(s);
}

G.puzzles.register('stamp-carver', {
  title: "Lem & Ziv's Corridor",
  create: function (root, config, api) {
    injectStyle();
    var pattern = String(config.pattern || 'abcabcabc');
    var parCost = (typeof config.parCost === 'number') ? config.parCost : pattern.length;
    var incompressible = !!config.incompressible;

    var stamps = [];            // carved substrings (strings)
    var stampColor = [];        // color group per stamp for tile tinting
    var selStart = -1, selEnd = -1; // tile selection range (inclusive)
    var dragging = false;
    var attempted = false;      // ever carved a stamp OR reached the lever threshold
    var totalPressesEver = 0;   // counts presses across resets (for lever gate)
    var leverShown = false;

    var wrap = document.createElement('div');
    wrap.className = 'st-wrap';
    wrap.innerHTML =
      '<div class="g-card">' +
        '<div class="st-flav">Lem: "The corridor is carved with the same shapes, over and over—"<br>' +
        'Ziv: "—so carve a <b>stamp</b> of a repeat once, then <b>press</b> it each time it returns. ' +
        'Drag across the glyphs to cut a stamp. Then tile left to right."</div>' +
      '</div>' +
      '<div class="st-hint">Corridor — drag (or tap start, tap end) to select a substring → carve it.</div>' +
      '<div class="st-corr" id="st-corr"></div>' +
      '<div class="st-row">' +
        '<button class="btn" id="st-carve" disabled>Carve stamp</button>' +
        '<button class="btn btn-ghost" id="st-clearsel" disabled>clear selection</button>' +
      '</div>' +
      '<div class="g-card">' +
        '<div class="st-flav" style="margin-bottom:.4rem">Stamp rack <span class="st-hint">(tap a stamp to discard it)</span></div>' +
        '<div class="st-rack" id="st-rack"></div>' +
      '</div>' +
      '<div class="g-card st-meter" id="st-meter"></div>' +
      '<div class="st-flav" style="font-size:.75rem">plan (greedy auto-tile):</div>' +
      '<div class="st-ops" id="st-ops"></div>' +
      '<div class="st-row">' +
        '<button class="btn btn-primary" id="st-stampit" disabled>Stamp it</button>' +
        '<button class="btn btn-ghost" id="st-reset">Reset (relay it)</button>' +
      '</div>' +
      '<div id="st-leverbox"></div>' +
      '<div id="st-result"></div>';
    root.appendChild(wrap);

    var corrEl = wrap.querySelector('#st-corr');
    var rackEl = wrap.querySelector('#st-rack');
    var meterEl = wrap.querySelector('#st-meter');
    var opsEl = wrap.querySelector('#st-ops');
    var carveBtn = wrap.querySelector('#st-carve');
    var clearSelBtn = wrap.querySelector('#st-clearsel');
    var stampItBtn = wrap.querySelector('#st-stampit');
    var resetBtn = wrap.querySelector('#st-reset');
    var leverBox = wrap.querySelector('#st-leverbox');
    var resultEl = wrap.querySelector('#st-result');

    /* ---------- corridor tiles ---------- */
    var tileEls = [];
    function buildCorridor() {
      corrEl.innerHTML = '';
      tileEls = [];
      for (var i = 0; i < pattern.length; i++) {
        var t = document.createElement('div');
        t.className = 'st-tile';
        t.textContent = pattern.charAt(i);
        corrEl.appendChild(t);
        (function (idx, node) {
          node.addEventListener('mousedown', function (e) { e.preventDefault(); startSel(idx); });
          node.addEventListener('mouseenter', function () { if (dragging) extendSel(idx); });
          node.addEventListener('mouseup', function () { endSel(idx); });
          // touch
          node.addEventListener('touchstart', function (e) { e.preventDefault(); tapSel(idx); }, { passive: false });
          // tap fallback (click) — toggle start/end
          node.addEventListener('click', function () { tapSel(idx); });
        })(i, t);
        tileEls.push(t);
      }
      // global mouseup to end drag even off-tiles
      document.addEventListener('mouseup', onDocUp);
    }
    function onDocUp() { dragging = false; }

    function startSel(i) { dragging = true; selStart = i; selEnd = i; renderSel(); }
    function extendSel(i) { if (!dragging) return; selEnd = i; renderSel(); }
    function endSel(i) { if (dragging) { selEnd = i; } dragging = false; renderSel(); }
    var tapAnchor = -1;
    function tapSel(i) {
      // tap-start / tap-end model (works alongside drag for touch & click)
      if (tapAnchor === -1 || selStart === -1) { tapAnchor = i; selStart = i; selEnd = i; }
      else { selStart = Math.min(tapAnchor, i); selEnd = Math.max(tapAnchor, i); tapAnchor = -1; }
      renderSel();
    }

    function selRange() {
      if (selStart < 0) return null;
      var a = Math.min(selStart, selEnd), b = Math.max(selStart, selEnd);
      return { a: a, b: b };
    }
    function renderSel() {
      var r = selRange();
      for (var i = 0; i < tileEls.length; i++) {
        tileEls[i].classList.toggle('sel', !!r && i >= r.a && i <= r.b);
      }
      var hasSel = !!r;
      carveBtn.disabled = !hasSel;
      clearSelBtn.disabled = !hasSel;
      if (hasSel) {
        var sub = pattern.substring(r.a, r.b + 1);
        carveBtn.textContent = 'Carve "' + sub + '" (cost ' + sub.length + ')';
      } else {
        carveBtn.textContent = 'Carve stamp';
      }
    }
    function clearSel() { selStart = selEnd = -1; tapAnchor = -1; renderSel(); }

    /* ---------- carving ---------- */
    function carve() {
      var r = selRange();
      if (!r) return;
      var sub = pattern.substring(r.a, r.b + 1);
      if (!sub) return;
      // avoid exact duplicates in the rack
      if (stamps.indexOf(sub) === -1) {
        stamps.push(sub);
        stampColor.push(stamps.length - 1);
      }
      attempted = true;
      api.sfx('select');
      clearSel();
      renderRack();
      renderPlan();
      maybeLever();
    }

    function discardStamp(i) {
      stamps.splice(i, 1);
      stampColor.splice(i, 1);
      api.sfx('close');
      renderRack();
      renderPlan();
    }

    function renderRack() {
      rackEl.innerHTML = '';
      if (!stamps.length) {
        rackEl.innerHTML = '<span class="st-empty">No stamps yet. Carve a repeat from the corridor.</span>';
        return;
      }
      for (var i = 0; i < stamps.length; i++) {
        var s = document.createElement('div');
        s.className = 'st-stamp';
        s.innerHTML = '<span class="glyphs">' + G.util.esc(stamps[i]) + '</span>' +
          '<span class="cost">len ' + stamps[i].length + '</span><span class="x">✕</span>';
        (function (idx, node) { node.addEventListener('click', function () { discardStamp(idx); }); })(i, s);
        rackEl.appendChild(s);
      }
    }

    /* ---------- plan / meter ---------- */
    function colorOfStamp(stamp) {
      var i = stamps.indexOf(stamp);
      return i === -1 ? 0 : (stampColor[i] % 5);
    }
    function renderPlan() {
      var res = greedyTile(pattern, stamps);
      var carve = carveCost(stamps);
      var total = planCost(stamps, res.presses);
      var raw = pattern.length;

      // tint corridor tiles by the op that covers them
      for (var i = 0; i < tileEls.length; i++) {
        tileEls[i].className = 'st-tile';
      }
      for (var o = 0; o < res.ops.length; o++) {
        var op = res.ops[o];
        for (var k = op.at; k < op.at + op.len; k++) {
          if (op.lit) tileEls[k].classList.add('tiled', 'lit');
          else tileEls[k].classList.add('tiled', 'g' + colorOfStamp(op.stamp));
        }
      }
      // re-apply selection highlight if any
      renderSel();

      // ops chips
      opsEl.innerHTML = '';
      for (o = 0; o < res.ops.length; o++) {
        var c = document.createElement('span');
        var oo = res.ops[o];
        if (oo.lit) { c.className = 'st-op lit'; c.textContent = 'chisel ' + oo.lit; }
        else { c.className = 'st-op stamp'; c.textContent = '⧉ ' + oo.stamp; }
        opsEl.appendChild(c);
      }

      var meets = total <= parCost && !incompressible;
      meterEl.innerHTML =
        '<div class="nums">' +
          '<span class="n">raw chiseling <b>' + raw + '</b> glyphs</span>' +
          '<span class="n">your plan <b class="' + (meets ? 'st-good' : (total > parCost ? 'st-bad' : '')) +
            '">' + total + '</b></span>' +
          '<span class="n">target <b class="st-tgt">≤ ' + parCost + '</b></span>' +
        '</div>' +
        '<div class="g-bar"><div class="g-bar-fill" style="width:' +
          Math.min(100, (total / Math.max(raw, parCost, 1)) * 100) + '%;background:' +
          (meets ? 'var(--green)' : (total > parCost ? 'var(--red)' : 'var(--blue)')) + '"></div></div>' +
        '<div class="st-arith" style="margin-top:.45rem">cost = Σ stamp lengths (<b>' + carve +
          '</b>) + presses (<b>' + res.presses + '</b>) = <b>' + total + '</b></div>';

      stampItBtn.disabled = !(total <= parCost) || incompressible;
      api.status('plan cost: <b>' + total + '</b> &nbsp;·&nbsp; target ≤ <b>' + parCost +
        '</b> &nbsp;·&nbsp; raw ' + raw);

      // track presses for lever gate (count this plan's presses if a real attempt)
      lastPresses = res.presses;
      lastTotal = total;
      maybeLever();
    }
    var lastPresses = pattern.length, lastTotal = pattern.length;

    /* ---------- incompressible lever ---------- */
    function maybeLever() {
      if (!incompressible || leverShown) return;
      // genuine attempt = a player action: >=1 stamp carved, OR >=10 presses
      // accumulated across reset relays. (NOT the initial render's raw presses,
      // so the lever never appears before the player has actually tried.)
      var genuine = (stamps.length >= 1) || (totalPressesEver >= 10);
      var exceeded = lastTotal > parCost;
      if (genuine && exceeded) {
        leverShown = true;
        showLever();
      }
    }
    function showLever() {
      leverBox.innerHTML =
        '<div class="st-lever">' +
          '<span style="flex:1">Lem: "Nothing repeats." &nbsp; Ziv: "It cannot be done."</span>' +
          '<button class="btn" id="st-lever-btn">Pull the lever</button>' +
        '</div>';
      leverBox.querySelector('#st-lever-btn').addEventListener('click', function () {
        api.sfx('zap');
        finishLever();
      });
    }

    /* ---------- reset ---------- */
    function reset() {
      // count the presses of the plan we are abandoning toward the lever gate
      totalPressesEver += lastPresses;
      stamps = []; stampColor = [];
      clearSel();
      api.sfx('close');
      renderRack();
      renderPlan();
      maybeLever();
    }

    /* ---------- finish ---------- */
    function stampIt() {
      var res = greedyTile(pattern, stamps);
      var total = planCost(stamps, res.presses);
      if (total > parCost || incompressible) return;
      api.sfx('solve');
      resultEl.innerHTML =
        '<div class="g-card st-lesson">Repeats are redundancy. A dictionary turns the second ' +
        'occurrence of a pattern into a single press — that is <b>LZ compression</b>, and it is ' +
        'how zip works. You carved <b>' + total + '</b> against a raw <b>' + pattern.length + '</b>.</div>' +
        '<div class="st-row"><button class="btn btn-primary" id="st-fin">Seal the corridor</button></div>';
      resultEl.querySelector('#st-fin').addEventListener('click', function () { api.complete(); });
      stampItBtn.disabled = true;
    }
    function finishLever() {
      resultEl.innerHTML =
        '<div class="g-card st-lesson">Random strings have no repeats to exploit: ' +
        '<b>incompressible = maximum entropy</b>. There is no shorter description than the thing ' +
        'itself. Knowing when <b>not</b> to compress is the lesson.</div>' +
        '<div class="st-row"><button class="btn btn-primary" id="st-fin">Leave it as it is</button></div>';
      resultEl.querySelector('#st-fin').addEventListener('click', function () { api.complete(); });
    }

    /* ---------- wire ---------- */
    carveBtn.addEventListener('click', carve);
    clearSelBtn.addEventListener('click', clearSel);
    stampItBtn.addEventListener('click', stampIt);
    resetBtn.addEventListener('click', reset);

    buildCorridor();
    renderRack();
    renderPlan();

    return {
      destroy: function () {
        document.removeEventListener('mouseup', onDocUp);
      }
    };
  }
});

})();
