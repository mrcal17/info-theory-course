/* THE QUIET ARCHIPELAGO — stamp-carver puzzle (PEDAGOGY.md §6.10).
   Lem & Ziv's corridor: compression by dictionary. Select substrings of the
   glyph pattern as STAMPS (cost = length), then the corridor is tiled greedily
   left-to-right with stamp presses (1 each) or literal chisels (1 each).
   total cost = Σ stamp lengths + presses; gate = total ≤ config.parCost.

   Teaching loop (one door = one round; the island provides the progression):
     guide — first structured door (untaught): HOOK ("cheapest it could be?"
             → depends on the pattern), live bet PREVIEW before carving, and
             live net savings uses×(len−1) − len per stamp; coach beats.
     strip — structured door once taught: no hook, no preview. Commit the
             carve first; the ledger appears only after.
     vault — incompressible config (regardless of taught): the lever is
             CHAINED until the player has carved ≥2 stamps and watched both
             run negative; then it unlocks ("most strings have no pattern to
             bet on; that's why they don't compress") and completes as before.
   Coaches: Lem & Ziv, alternating lines, finishing each other's sentences. */
(function () {
'use strict';

/* ---------------- pure logic (mirrored by _smoke/pz_test_stamp-carver.mjs) */

function matchesAt(pattern, pos, stamp) {
  if (!stamp) return false;
  if (pos + stamp.length > pattern.length) return false;
  return pattern.substr(pos, stamp.length) === stamp;
}

/* Greedy tiling: at the current position apply the LONGEST stamp that
   matches exactly here; if none, chisel one literal glyph. A press = one
   stamp application OR one literal. */
function greedyTile(pattern, stamps) {
  var pos = 0, presses = 0, ops = [];
  while (pos < pattern.length) {
    var best = null;
    for (var i = 0; i < stamps.length; i++) {
      if (stamps[i] && matchesAt(pattern, pos, stamps[i])) {
        if (!best || stamps[i].length > best.length) best = stamps[i];
      }
    }
    if (best) { ops.push({ stamp: best, at: pos, len: best.length }); pos += best.length; }
    else { ops.push({ lit: pattern.charAt(pos), at: pos, len: 1 }); pos += 1; }
    presses++;
  }
  return { presses: presses, ops: ops };
}

function carveCost(stamps) {
  var c = 0;
  for (var i = 0; i < stamps.length; i++) c += stamps[i].length;
  return c;
}
function planCost(stamps, presses) { return carveCost(stamps) + presses; }

/* How many times the greedy plan actually presses each stamp. */
function stampUses(ops) {
  var u = {};
  for (var i = 0; i < ops.length; i++) {
    if (ops[i].stamp) u[ops[i].stamp] = (u[ops[i].stamp] || 0) + 1;
  }
  return u;
}

/* The bet: each press replaces len glyphs with 1 press (saves len−1), but
   the carving itself cost len. Identity: raw − Σ net = total plan cost. */
function netSavings(len, uses) { return uses * (len - 1) - len; }

function literalCount(ops) {
  var n = 0;
  for (var i = 0; i < ops.length; i++) if (ops[i].lit) n++;
  return n;
}

/* Best single stamp under the game's own cost model (for hint 3). */
function bestSingleStamp(pattern) {
  var best = null, seen = {};
  for (var a = 0; a < pattern.length; a++) {
    for (var b = a + 2; b <= pattern.length; b++) {
      var s = pattern.substring(a, b);
      if (seen[s]) continue;
      seen[s] = true;
      var cost = s.length + greedyTile(pattern, [s]).presses;
      if (!best || cost < best.cost) best = { stamp: s, cost: cost };
    }
  }
  return best;
}

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
    '.st-tile{min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;',
    '  font-family:ui-monospace,Menlo,Consolas,monospace;font-size:1.15rem;font-weight:700;',
    '  background:var(--surface);border:2px solid var(--surface2);border-radius:8px;color:var(--text);',
    '  cursor:pointer;-webkit-user-select:none;user-select:none;transition:.12s;}',
    '.st-tile.sel{border-color:var(--purple);color:var(--purple);background:#241b3a;}',
    '.st-tile.tiled{opacity:.85;border-color:#2c3a52;}',
    '.st-tile.lit{background:#2a2030;border-color:var(--orange);}',
    '.st-tile.g0{border-bottom-color:var(--blue);}',
    '.st-tile.g1{border-bottom-color:var(--green);}',
    '.st-tile.g2{border-bottom-color:var(--pink);}',
    '.st-tile.g3{border-bottom-color:var(--yellow);}',
    '.st-tile.g4{border-bottom-color:var(--cyan);}',
    '.st-rack{display:flex;flex-wrap:wrap;gap:.5rem;min-height:48px;align-items:center;}',
    '.st-stamp{display:flex;align-items:center;gap:.45rem;padding:.3rem .55rem;border-radius:8px;',
    '  border:2px solid var(--purple);background:#1c1730;min-height:44px;cursor:pointer;flex-wrap:wrap;}',
    '.st-stamp:hover{background:#241b3a;}',
    '.st-stamp .glyphs{font-family:ui-monospace,Consolas,monospace;font-weight:700;color:var(--purple);}',
    '.st-stamp .cost{font-size:.7rem;color:var(--muted);}',
    '.st-stamp .x{color:var(--dim);font-size:.8rem;padding-left:.2rem;}',
    '.st-stamp.neg{border-color:var(--red);box-shadow:0 0 10px rgba(248,113,113,.35);}',
    '.st-net{font-size:.74rem;font-family:ui-monospace,Consolas,monospace;font-variant-numeric:tabular-nums;}',
    '.st-net.pos{color:var(--green);}',
    '.st-net.zero{color:var(--muted);}',
    '.st-net.neg{color:var(--red);text-shadow:0 0 8px rgba(248,113,113,.9);}',
    '.st-preview{font-size:.78rem;color:var(--muted);min-height:1.2rem;',
    '  font-family:ui-monospace,Consolas,monospace;font-variant-numeric:tabular-nums;}',
    '.st-preview b.pos{color:var(--green);}',
    '.st-preview b.neg{color:var(--red);}',
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
    '.st-row .btn{min-height:44px;}',
    '.st-lever{display:flex;align-items:center;gap:.6rem;padding:.7rem;border-radius:10px;',
    '  border:2px dashed var(--red);background:#2a1518;font-size:.85rem;line-height:1.45;}',
    '.st-lever .btn{border-color:var(--red);color:var(--red);min-height:44px;}',
    '.st-lever.locked{border-color:var(--dim);background:#181624;}',
    '.st-lever.locked .btn{border-color:var(--dim);color:var(--dim);cursor:not-allowed;}',
    '.st-coach{display:flex;flex-direction:column;gap:.5rem;}',
    '.st-dict{width:100%;border-collapse:collapse;font-size:.8rem;margin:.2rem 0 .4rem;}',
    '.st-dict th{text-align:left;color:var(--dim);font-weight:600;font-size:.68rem;',
    '  text-transform:uppercase;letter-spacing:.05em;padding:.18rem .5rem .18rem 0;}',
    '.st-dict td{padding:.18rem .5rem .18rem 0;border-top:1px solid var(--surface2);',
    '  font-family:ui-monospace,Consolas,monospace;font-variant-numeric:tabular-nums;}',
    '.st-dict td.ph{color:var(--purple);font-weight:700;}',
    '.st-hint{font-size:.78rem;color:var(--dim);}'
  ].join('');
  document.head.appendChild(s);
}

G.puzzles.register('stamp-carver', {
  title: "Lem & Ziv's Corridor",
  /* exposed for the scratch logic test (node, no browser; never used in-game) */
  _test: {
    matchesAt: matchesAt, greedyTile: greedyTile, carveCost: carveCost,
    planCost: planCost, stampUses: stampUses, netSavings: netSavings,
    literalCount: literalCount, bestSingleStamp: bestSingleStamp
  },
  create: function (root, config, api) {
    injectStyle();
    var esc = G.util.esc;
    var pattern = String(config.pattern || 'abcabcabc');
    var parCost = (typeof config.parCost === 'number') ? config.parCost : pattern.length;
    var incompressible = !!config.incompressible;
    var N = pattern.length;
    var wasTaught = G.pz.taught('stamp-carver');
    /* guide: first structured door — hook + bet preview + coach beats.
       strip: structured once taught — no hook; ledger only AFTER carving.
       vault: incompressible — chained lever (applies regardless of taught). */
    var mode = incompressible ? 'vault' : (wasTaught ? 'strip' : 'guide');

    var stamps = [];            // carved substrings (strings, no duplicates)
    var stampColor = [];        // color group per stamp for tile tinting
    var selStart = -1, selEnd = -1, dragging = false, tapAnchor = -1;
    var finished = false;       // debrief shown; no further edits
    var leverUnlocked = false;
    var negSeen = {};           // vault: stamps the player has watched run red
    var firstCarve = true;
    var coachTurn = 0;          // 0 → Lem speaks next, 1 → Ziv

    var best = incompressible ? null : bestSingleStamp(pattern);
    var hints = incompressible
      ? ['hunt for any stretch that appears twice in the wall. take your time — we\'ll wait.',
         'carve a guess anyway and read its ledger. a bet that never repays runs <b>red</b>.',
         'two red bets is proof. nothing in here repeats — the chained lever is the honest answer.']
      : ['carve what you <b>SEE</b> twice — find a stretch of glyphs that appears again later in the corridor, and cut exactly that.',
         'longer repeats pay more per press — a 4-glyph stamp saves 3 glyphs every time it lands; a 2-glyph stamp saves only 1.',
         (best && best.cost <= parCost
           ? 'point at it: carve exactly "<b>' + esc(best.stamp) + '</b>" and nothing else — the greedy tiling then costs ' +
             best.cost + ', inside the par of ' + parCost + '.'
           : 'carve the longest stretch that appears twice, and only that.')];
    var ladder = G.pz.hintLadder(hints);

    var wrap = document.createElement('div');
    wrap.className = 'st-wrap';
    root.appendChild(wrap);

    /* element refs (filled by buildMain) */
    var corrEl, rackEl, meterEl, opsEl, carveBtn, clearSelBtn, stampItBtn,
        resetBtn, leverBox, coachEl, previewEl, resultEl, tileEls = [];

    /* ---------- HOOK (predict-then-find-out; skipped once taught) ---------- */
    if (!wasTaught) {
      api.status('predict first — then carve');
      var hook = G.pz.hookCard({
        question: 'This corridor is <b>' + N + ' glyphs</b>. Chiselled one at a time, that is ' +
          N + ' presses. What is the CHEAPEST it could possibly cost?',
        options: [
          { label: 'About ' + Math.ceil(N / 2), note: 'patterns mean half price' },
          { label: '' + Math.max(2, Math.ceil(G.pz.log2(N))), note: 'log₂ ' + N + ', like the questions game' },
          { label: 'Depends on the pattern', note: 'repeats decide' },
          { label: N + ' — no cheaper', note: 'a glyph is a glyph' }
        ],
        correct: 2,
        reveal: 'Repeats are the only discount. "moso moso moso" collapses to one stamp pressed ' +
          'three times; a patternless scrawl will not budge below its own length. ' +
          '<b>The pattern decides.</b> Time to read this wall.',
        onDone: function () {
          if (hook.parentNode) hook.parentNode.removeChild(hook);
          buildMain();
        }
      });
      wrap.appendChild(hook);
    } else {
      buildMain();
    }

    /* ---------- main UI ---------- */
    function buildMain() {
      var flav;
      if (mode === 'guide') {
        flav = 'Lem: "the corridor is carved with the same shapes, over and over—"<br>' +
          'Ziv: "—so carve a <b>stamp</b> of a repeat once, then <b>press</b> it each time it returns. ' +
          'drag across the glyphs to cut a stamp."';
      } else if (mode === 'strip') {
        flav = 'Lem: "you know the trick. this wall is tighter, and the ledger—"<br>' +
          'Ziv: "—shows itself only <b>after</b> you cut. commit first; read after."';
      } else {
        flav = 'Lem: "' + N + ' marks, courier. the vault does not echo—"<br>' +
          'Ziv: "—and the lever is <b>chained</b>. earn it: carve your bets, and watch the ledger."';
      }
      var main = document.createElement('div');
      main.className = 'st-wrap';
      main.innerHTML =
        '<div class="g-card"><div class="st-flav">' + flav + '</div></div>' +
        '<div class="st-hint">Corridor — drag (or tap start, tap end) to select a substring, then carve it.</div>' +
        '<div class="st-corr" id="st-corr"></div>' +
        '<div class="st-row">' +
          '<button class="btn" id="st-carve" disabled>Carve stamp</button>' +
          '<button class="btn btn-ghost" id="st-clearsel" disabled>clear selection</button>' +
        '</div>' +
        (mode === 'guide' ? '<div class="st-preview" id="st-preview"></div>' : '') +
        '<div class="g-card">' +
          '<div class="st-flav" style="margin-bottom:.4rem">Stamp rack — each stamp’s bet: ' +
            'net = uses×(len−1) − len <span class="st-hint">(tap a stamp to discard it)</span></div>' +
          '<div class="st-rack" id="st-rack"></div>' +
        '</div>' +
        '<div class="g-card st-meter" id="st-meter"></div>' +
        '<div class="st-flav" style="font-size:.75rem">plan (greedy auto-tile):</div>' +
        '<div class="st-ops" id="st-ops"></div>' +
        '<div class="st-row">' +
          '<button class="btn btn-primary" id="st-stampit">Stamp it</button>' +
          '<button class="btn btn-ghost" id="st-reset">Reset (relay it)</button>' +
        '</div>' +
        '<div id="st-leverbox"></div>' +
        '<div class="st-coach" id="st-coach"></div>' +
        '<div id="st-result"></div>';
      wrap.appendChild(main);

      corrEl = main.querySelector('#st-corr');
      rackEl = main.querySelector('#st-rack');
      meterEl = main.querySelector('#st-meter');
      opsEl = main.querySelector('#st-ops');
      carveBtn = main.querySelector('#st-carve');
      clearSelBtn = main.querySelector('#st-clearsel');
      stampItBtn = main.querySelector('#st-stampit');
      resetBtn = main.querySelector('#st-reset');
      leverBox = main.querySelector('#st-leverbox');
      coachEl = main.querySelector('#st-coach');
      previewEl = main.querySelector('#st-preview');
      resultEl = main.querySelector('#st-result');

      carveBtn.addEventListener('click', carve);
      clearSelBtn.addEventListener('click', clearSel);
      stampItBtn.addEventListener('click', stampIt);
      resetBtn.addEventListener('click', reset);

      buildCorridor();
      if (mode === 'vault') renderLever();
      renderPlan();
    }

    /* ---------- coach (Lem & Ziv alternate; ≤ 2 cards visible) ---------- */
    function pushCoach(who, html) {
      if (!coachEl) return;
      coachEl.appendChild(G.pz.coachCard(who, html));
      while (coachEl.children.length > 2) coachEl.removeChild(coachEl.firstChild);
    }
    function coachSay(html) {
      pushCoach((coachTurn++ % 2 === 0) ? 'lem' : 'ziv', html);
    }
    /* one sentence split across the twins — they finish each other's */
    function coachPair(lemHtml, zivHtml) {
      coachTurn = 0;
      coachSay(lemHtml);
      coachSay(zivHtml);
    }

    /* ---------- corridor tiles ---------- */
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
          node.addEventListener('touchstart', function (e) { e.preventDefault(); tapSel(idx); }, { passive: false });
          node.addEventListener('click', function () { tapSel(idx); });
        })(i, t);
        tileEls.push(t);
      }
      document.addEventListener('mouseup', onDocUp);
    }
    function onDocUp() { dragging = false; }

    function startSel(i) { if (finished) return; dragging = true; selStart = i; selEnd = i; renderSel(); }
    function extendSel(i) { if (!dragging || finished) return; selEnd = i; renderSel(); }
    function endSel(i) { if (finished) return; if (dragging) { selEnd = i; } dragging = false; renderSel(); }
    function tapSel(i) {
      if (finished) return;
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
      var hasSel = !!r && !finished;
      carveBtn.disabled = !hasSel;
      clearSelBtn.disabled = !hasSel;
      if (hasSel) {
        var sub = pattern.substring(r.a, r.b + 1);
        carveBtn.textContent = 'Carve "' + sub + '" (cost ' + sub.length + ')';
      } else {
        carveBtn.textContent = 'Carve stamp';
      }
      renderPreview(hasSel ? pattern.substring(r.a, r.b + 1) : null);
    }
    function clearSel() { selStart = selEnd = -1; tapAnchor = -1; renderSel(); }

    /* guide-only: the bet, previewed BEFORE committing the carve */
    function renderPreview(sub) {
      if (!previewEl) return;
      if (!sub) { previewEl.innerHTML = 'select a stretch to preview its bet.'; return; }
      if (stamps.indexOf(sub) !== -1) {
        previewEl.innerHTML = '"' + esc(sub) + '" is already in the rack.';
        return;
      }
      var hyp = greedyTile(pattern, stamps.concat([sub]));
      var u = stampUses(hyp.ops)[sub] || 0;
      var net = netSavings(sub.length, u);
      previewEl.innerHTML = 'bet: ' + u + '×(' + sub.length + '−1) − ' + sub.length +
        ' = <b class="' + (net > 0 ? 'pos' : (net < 0 ? 'neg' : '')) + '">' +
        (net > 0 ? '+' : '') + net + '</b>' +
        (net < 0 ? ' — this bet loses' : (net > 0 ? ' — this bet pays' : ' — break-even'));
    }

    /* ---------- carving ---------- */
    function carve() {
      if (finished) return;
      var r = selRange();
      if (!r) return;
      var sub = pattern.substring(r.a, r.b + 1);
      if (!sub) return;
      if (stamps.indexOf(sub) === -1) {
        stamps.push(sub);
        stampColor.push(stamps.length - 1);
      }
      api.sfx('select');
      clearSel();
      renderPlan();
      if (firstCarve) {
        firstCarve = false;
        if (mode === 'guide') {
          coachPair('"a stamp is a bet—"',
            '"—that the pattern repeats. each press saves len−1 glyphs, but the carving cost you len. watch its ledger."');
        }
      }
    }

    function discardStamp(i) {
      if (finished) return;
      stamps.splice(i, 1);
      stampColor.splice(i, 1);
      api.sfx('close');
      renderPlan();
    }

    /* ---------- plan / meter / rack ---------- */
    function colorOfStamp(stamp) {
      var i = stamps.indexOf(stamp);
      return i === -1 ? 0 : (stampColor[i] % 5);
    }
    function renderPlan() {
      var res = greedyTile(pattern, stamps);
      var carved = carveCost(stamps);
      var total = planCost(stamps, res.presses);
      var uses = stampUses(res.ops);

      // tint corridor tiles by the op that covers them
      for (var i = 0; i < tileEls.length; i++) tileEls[i].className = 'st-tile';
      for (var o = 0; o < res.ops.length; o++) {
        var op = res.ops[o];
        for (var k = op.at; k < op.at + op.len; k++) {
          if (op.lit) tileEls[k].classList.add('tiled', 'lit');
          else tileEls[k].classList.add('tiled', 'g' + colorOfStamp(op.stamp));
        }
      }
      renderSel(); // re-apply selection highlight + preview

      // ops chips
      opsEl.innerHTML = '';
      for (o = 0; o < res.ops.length; o++) {
        var c = document.createElement('span');
        var oo = res.ops[o];
        if (oo.lit) { c.className = 'st-op lit'; c.textContent = 'chisel ' + oo.lit; }
        else { c.className = 'st-op stamp'; c.textContent = '⧉ ' + oo.stamp; }
        opsEl.appendChild(c);
      }

      renderRack(uses);
      if (incompressible) updateVault(uses);

      var over = total > parCost;
      var meets = !over && !incompressible;
      meterEl.innerHTML =
        '<div class="nums">' +
          '<span class="n">raw chiseling <b>' + N + '</b> glyphs</span>' +
          '<span class="n">your plan <b class="' + (meets ? 'st-good' : (over ? 'st-bad' : '')) +
            '">' + total + '</b></span>' +
          '<span class="n">target <b class="st-tgt">≤ ' + parCost + '</b></span>' +
        '</div>' +
        '<div class="g-bar"><div class="g-bar-fill" style="width:' +
          Math.min(100, (total / Math.max(N, parCost, 1)) * 100) + '%;background:' +
          (meets ? 'var(--green)' : (over ? 'var(--red)' : 'var(--blue)')) + '"></div></div>' +
        '<div class="st-arith" style="margin-top:.45rem">cost = Σ stamp lengths (<b>' + carved +
          '</b>) + presses (<b>' + res.presses + '</b>) = <b>' + total + '</b>' +
          (stamps.length ? ' &nbsp;·&nbsp; Σ net: <b class="' +
            (N - total > 0 ? 'st-good' : (N - total < 0 ? 'st-bad' : '')) + '">' +
            (N - total > 0 ? '+' : '') + (N - total) + '</b>' : '') + '</div>';

      stampItBtn.disabled = finished;
      api.status('plan cost: <b>' + total + '</b> &nbsp;·&nbsp; target ≤ <b>' + parCost +
        '</b> &nbsp;·&nbsp; raw ' + N);
    }

    function renderRack(uses) {
      rackEl.innerHTML = '';
      if (!stamps.length) {
        rackEl.innerHTML = '<span class="st-empty">No stamps yet. Carve a repeat from the corridor.</span>';
        return;
      }
      for (var i = 0; i < stamps.length; i++) {
        var st = stamps[i], u = uses[st] || 0, net = netSavings(st.length, u);
        var ncls = net > 0 ? 'pos' : (net < 0 ? 'neg' : 'zero');
        var s = document.createElement('div');
        s.className = 'st-stamp' + (net < 0 ? ' neg' : '');
        s.innerHTML = '<span class="glyphs">' + esc(st) + '</span>' +
          '<span class="cost">len ' + st.length + ' · ×' + u + '</span>' +
          '<span class="st-net ' + ncls + '">' + u + '×' + (st.length - 1) + '−' + st.length +
            ' = ' + (net > 0 ? '+' : '') + net + '</span>' +
          '<span class="x">✕</span>';
        (function (idx, node) { node.addEventListener('click', function () { discardStamp(idx); }); })(i, s);
        rackEl.appendChild(s);
      }
    }

    /* ---------- vault: the chained lever ---------- */
    function updateVault(uses) {
      var newlyRed = false;
      for (var i = 0; i < stamps.length; i++) {
        var s = stamps[i];
        if (netSavings(s.length, uses[s] || 0) < 0 && !negSeen[s]) {
          negSeen[s] = true;
          newlyRed = true;
        }
      }
      if (leverUnlocked) return;
      var negCount = Object.keys(negSeen).length;
      if (negCount >= 2) {
        unlockLever();
      } else if (newlyRed && negCount === 1) {
        coachSay('"red. the bet never landed — nothing in this wall paid it back. try another."');
      }
    }
    function renderLever() {
      if (!leverBox) return;
      if (!leverUnlocked) {
        leverBox.innerHTML =
          '<div class="st-lever locked">' +
            '<span style="flex:1">⛓ The lever is <b style="font-style:normal">chained</b>. ' +
              '<span class="st-hint">It unlocks for a digger who has tried the wall — carve, and watch the ledger.</span></span>' +
            '<button class="btn" id="st-lever-btn" disabled>Pull the lever</button>' +
          '</div>';
      } else {
        leverBox.innerHTML =
          '<div class="st-lever">' +
            '<span style="flex:1">The chain falls away.</span>' +
            '<button class="btn" id="st-lever-btn">Pull the lever</button>' +
          '</div>';
      }
      leverBox.querySelector('#st-lever-btn').addEventListener('click', function () {
        if (!leverUnlocked || finished) return;  // pulling early is impossible
        api.sfx('zap');
        finishLever();
      });
    }
    function unlockLever() {
      leverUnlocked = true;
      api.sfx('spark');
      renderLever();
      coachPair('"nothing repeats. most strings have no pattern to bet on—"',
        '"—and that’s why they don’t compress. the lever is yours."');
    }

    /* ---------- gate ---------- */
    function stampIt() {
      if (finished) return;
      var res = greedyTile(pattern, stamps);
      var total = planCost(stamps, res.presses);
      if (!incompressible && total <= parCost) { succeed(res, total); return; }
      api.fail(incompressible
        ? 'The vault refuses: cost ' + total + ' against a demand of ' + parCost + '. Nothing gives.'
        : 'The runes reject it: cost ' + total + ', over the par of ' + parCost + '.');
      var h = ladder.fail();
      if (h) coachSay(h);
    }

    function reset() {
      if (finished) return;
      stamps = []; stampColor = [];
      clearSel();
      api.sfx('close');
      renderPlan();
    }

    /* ---------- debriefs ---------- */
    function dictTable(res) {
      var uses = stampUses(res.ops), lits = literalCount(res.ops);
      var rows = '';
      for (var i = 0; i < stamps.length; i++) {
        var st = stamps[i], u = uses[st] || 0, net = netSavings(st.length, u);
        rows += '<tr><td class="ph">' + esc(st) + '</td><td>' + st.length + '</td><td>×' + u +
          '</td><td style="color:var(--' + (net > 0 ? 'green' : (net < 0 ? 'red' : 'muted')) + ')">' +
          (net > 0 ? '+' : '') + net + '</td></tr>';
      }
      rows += '<tr><td class="ph" style="color:var(--orange)">(literal glyphs)</td><td>1</td><td>×' +
        lits + '</td><td>—</td></tr>';
      return '<table class="st-dict"><tr><th>phrase</th><th>len</th><th>uses</th><th>net</th></tr>' +
        rows + '</table>';
    }

    function succeed(res, total) {
      finished = true;
      ladder.reset();
      clearSel();
      carveBtn.disabled = true; clearSelBtn.disabled = true;
      stampItBtn.disabled = true; resetBtn.disabled = true;
      api.sfx('solve');
      var card = G.pz.debriefCard({
        tone: 'win',
        title: 'Corridor sealed — cost ' + total + ' against ' + N + ' raw',
        html: dictTable(res) +
          '<p style="margin:.3rem 0 0"><span class="pzk-eq">' + N + ' raw − ' + (N - total) +
          ' net saved = ' + total + ' ≤ par ' + parCost + '</span>. ' +
          'Your phrase table above is the whole trick: <b>this is LZ</b> — your zip files carve ' +
          'these exact stamps, turning every repeated stretch into one short reference back into ' +
          'the dictionary.</p>',
        buttonLabel: 'Seal the corridor',
        onButton: function () { G.pz.markTaught('stamp-carver'); api.complete(); }
      });
      resultEl.appendChild(card);
      if (card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function finishLever() {
      finished = true;
      clearSel();
      carveBtn.disabled = true; clearSelBtn.disabled = true;
      stampItBtn.disabled = true; resetBtn.disabled = true;
      var res = greedyTile(pattern, stamps);
      var card = G.pz.debriefCard({
        tone: 'info',
        title: 'The Patternless Vault',
        html: dictTable(res) +
          '<p style="margin:.3rem 0 0">Every bet ran red: in these ' + N + ' marks no stretch ' +
          'repeats, so no stamp can pay for its own carving. A random string is already its own ' +
          'shortest description — <b>incompressible = maximum entropy</b>. Most strings have no ' +
          'pattern to bet on; that is why they don’t compress, and why a zip file of random ' +
          'data comes out no smaller than it went in.</p>',
        buttonLabel: 'Leave it as it is',
        onButton: function () { G.pz.markTaught('stamp-carver'); api.complete(); }
      });
      resultEl.appendChild(card);
      if (card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    return {
      destroy: function () {
        document.removeEventListener('mouseup', onDocUp);
      }
    };
  }
});

})();
