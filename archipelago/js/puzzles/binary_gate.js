/* THE QUIET ARCHIPELAGO — 'binary-gate' puzzle (PEDAGOGY.md §6.1 deep rework).
   The mail-sorting machine of Beacon Rock: a hidden addressee among N; the
   player asks yes/no questions until exactly one name remains. Teaching loop:

     HOOK    — predict: how many questions ALWAYS sort a letter? (⌈log₂N⌉)
     GUIDE   — round 1, full instrumentation (split previews, bits labels,
               halving meter, ledger). Gate: sort in ≤ ⌈log₂N⌉ questions —
               nearly un-failable with the config traits; teaches the meter.
     STRIP   — instrumentation hidden (no bits, no previews); only a raw
               trait table. Internal decoy "by name" questions (lopsided
               1-vs-N−1 splits) are LISTED FIRST, so clicking top-to-bottom
               provably blows the budget (the kill-switch). The gate fires
               the moment the remaining budget can no longer suffice:
               spent + ⌈log₂(alive)⌉ + lettersLeft·⌈log₂N⌉ > budget.
     MASTERY — (configs with ≥ 6 items) a batch of 3 letters, total purse
               3·⌈log₂N⌉ questions = the information floor 3·log₂N bits.
     DEBRIEF — the player's actual ledger summed against L·log₂N.

   Repeat encounters (G.pz.taught('binary-gate')) skip hook + guide.
   Coach: Maren. Gate failure = instant fresh letter (re-rolled target) +
   coach correction (the most lopsided question they paid for) + hint
   ladder per PEDAGOGY §1.7.

   Contract: js/core/overlay.js — create(root, config, api); api = {complete,
   fail, close, sfx, status, rng}. Config (FROZEN, islands rely on it):
     { items:[{name, traits:{key:bool,...}},...],
       traitLabels:{key:'Question text?'}, parQuestions:n, target?:index }
   Decoy traits/questions are internal only — the config is never mutated.
   Hidden targets in decoy rounds never land on a decoy-named item, so the
   decoys always answer NO (a wasted question, never a lucky isolation). */
(function () {
'use strict';

/* ------------------------------------------------------------------ */
/* pure logic (exposed as _test on the registered def for the node    */
/* harness — _smoke/pz_test_binary-gate.mjs; not used by the game)    */
/* ------------------------------------------------------------------ */

function log2(x) { return Math.log(x) / Math.LN2; }

// binary entropy in bits
function h2(p) {
  if (p <= 0 || p >= 1) return 0;
  return -(p * log2(p) + (1 - p) * log2(1 - p));
}

// over a candidate list, how many answer YES vs NO to a trait key
function splitCounts(items, key) {
  var yes = 0, no = 0;
  for (var i = 0; i < items.length; i++) {
    if (items[i].traits && items[i].traits[key]) yes++; else no++;
  }
  return { yes: yes, no: no };
}

// expected information (bits) a yes/no question yields given its split
function splitBits(yes, no) {
  var n = yes + no;
  if (n <= 0) return 0;
  return h2(yes / n);
}

// keep only candidates whose trait matches the machine's answer
function eliminate(items, key, answer) {
  var want = !!answer;
  return items.filter(function (it) {
    return (!!(it.traits && it.traits[key])) === want;
  });
}

// ceil(log2 n) — the number of perfect questions that always suffice
function ceilLog2(n) {
  if (n <= 1) return 0;
  var k = 0, p = 1;
  while (p < n) { p *= 2; k++; }
  return k;
}

// '8 → 4 → 2 → 1'
function halvingChain(n) {
  var parts = [n];
  while (n > 1) { n = Math.ceil(n / 2); parts.push(n); }
  return parts.join(' → ');
}

// 'Shannon (lighthouse)' -> 'Shannon'
function shortName(name) {
  var s = String(name || '');
  var m = s.split(/[\s(]+/)[0];
  return m || s;
}

/* Internal decoy questions: 'by name' singletons (1 vs N−1) for the LAST
   and FIRST config items. They are listed before the config questions in
   strip/mastery rounds; their lopsided split is the kill-switch. The hook's
   wrong option ("name by name") is exactly this strategy, made tappable. */
function buildDecoys(items) {
  if (!items || items.length < 4) return [];
  var lastI = items.length - 1;
  var ln = shortName(items[lastI].name), fn = shortName(items[0].name);
  return [
    { key: '_dz1', idx: lastI, label: 'Is it for ' + ln + ', by name?', short: ln + '?' },
    { key: '_dz2', idx: 0,     label: 'Is it for ' + fn + ', by name?', short: fn + '?' },
  ];
}

/* Gate predicate: TRUE = provably mis-sorted (even perfect halving questions
   can no longer finish inside the budget).
     spent       — questions used so far in this round (whole batch)
     alive       — candidates still possible for the CURRENT letter
     perLetter   — per-letter budget = ⌈log₂N⌉ (untouched letters need this)
     lettersLeft — letters still waiting AFTER the current one
     budgetTotal — the round's whole purse */
function gateFail(spent, alive, perLetter, lettersLeft, budgetTotal) {
  if (!isFinite(budgetTotal)) return false;
  var need = ceilLog2(alive) + lettersLeft * perLetter;
  return spent + need > budgetTotal;
}

/* Minimax worst-case questions to isolate any target with the given trait
   keys; Infinity if the traits cannot fully separate the items. Used only
   to loosen the budget for hypothetical configs whose traits are imperfect
   (both frozen configs are perfect codes: optWorst === ⌈log₂N⌉). */
function optWorst(items, keys) {
  var n = items.length;
  if (!n) return 0;
  if (n > 20 || keys.length > 20) return ceilLog2(n); // safety for huge configs
  var memo = Object.create(null);
  function pop(mask) { var c = 0; while (mask) { mask &= mask - 1; c++; } return c; }
  function rec(aliveMask, usedMask) {
    if (pop(aliveMask) <= 1) return 0;
    var mk = aliveMask + ':' + usedMask;
    if (mk in memo) return memo[mk];
    var best = Infinity;
    for (var k = 0; k < keys.length; k++) {
      if (usedMask & (1 << k)) continue;
      var yes = 0, no = 0;
      for (var i = 0; i < n; i++) {
        if (!(aliveMask & (1 << i))) continue;
        if (items[i].traits && items[i].traits[keys[k]]) yes |= (1 << i);
        else no |= (1 << i);
      }
      if (!yes || !no) continue;
      var u = usedMask | (1 << k);
      var c = 1 + Math.max(rec(yes, u), rec(no, u));
      if (c < best) best = c;
    }
    memo[mk] = best;
    return best;
  }
  return rec((1 << n) - 1, 0);
}

/* ------------------------------------------------------------------ */
/* one-time style                                                     */
/* ------------------------------------------------------------------ */

function injectStyle() {
  if (document.getElementById('bg-style')) return;
  var s = document.createElement('style');
  s.id = 'bg-style';
  s.textContent = [
    '.bg-wrap{display:flex;flex-direction:column;gap:0.7rem;}',
    '.bg-flavor{color:var(--muted);font-size:0.9rem;line-height:1.5;}',
    '.bg-flavor b{color:var(--text);}',
    '.bg-chips{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:0.5rem;}',
    '.bg-chip{min-height:44px;display:flex;align-items:center;justify-content:center;text-align:center;',
    '  padding:0.4rem 0.5rem;border:2px solid var(--surface2);border-radius:10px;background:var(--surface);',
    '  color:var(--text);font-size:0.85rem;transition:opacity .2s,border-color .2s,background .2s;}',
    '.bg-chip.bg-out{opacity:0.32;border-color:var(--border);background:transparent;text-decoration:line-through;color:var(--dim);}',
    '.bg-chip.bg-win{border-color:var(--green);color:var(--green);box-shadow:0 0 0 1px var(--green);}',
    '.bg-qlist{display:flex;flex-direction:column;gap:0.45rem;}',
    '.bg-q{display:flex;align-items:center;gap:0.6rem;min-height:44px;width:100%;text-align:left;',
    '  padding:0.5rem 0.8rem;border:2px solid var(--surface2);border-radius:10px;background:var(--surface);',
    '  color:var(--text);font-size:0.92rem;cursor:pointer;transition:border-color .15s,background .15s;}',
    '.bg-q:hover,.bg-q:focus{border-color:var(--blue);outline:none;background:var(--surface2);}',
    '.bg-q .bg-qtext{flex:1;}',
    '.bg-q .bg-qbits{flex:0 0 auto;font-variant-numeric:tabular-nums;font-size:0.82rem;color:var(--muted);}',
    '.bg-qtag{flex:0 0 auto;font-size:0.66rem;letter-spacing:0.05em;text-transform:uppercase;color:var(--dim);',
    '  border:1px solid var(--surface2);border-radius:6px;padding:0.12rem 0.34rem;white-space:nowrap;}',
    '.bg-readout{min-height:1.4rem;font-size:0.9rem;color:var(--muted);font-variant-numeric:tabular-nums;}',
    '.bg-readout b{color:var(--text);}',
    '.bg-meter{font-size:0.88rem;color:var(--muted);font-variant-numeric:tabular-nums;padding:0 0.15rem;}',
    '.bg-meter b{color:var(--cyan);}',
    '.bg-tablewrap{overflow-x:auto;}',
    '.bg-table{border-collapse:collapse;width:100%;font-size:0.82rem;}',
    '.bg-table th,.bg-table td{padding:0.26rem 0.35rem;text-align:center;border-bottom:1px solid var(--surface2);}',
    '.bg-table tr:last-child th,.bg-table tr:last-child td{border-bottom:none;}',
    '.bg-table tbody th,.bg-table tr th:first-child{text-align:left;color:var(--text);font-weight:500;',
    '  max-width:108px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.bg-table thead th{color:var(--dim);font-size:0.68rem;text-transform:uppercase;letter-spacing:0.04em;}',
    '.bg-table tr.bg-out th{opacity:0.32;text-decoration:line-through;color:var(--dim);}',
    '.bg-table tr.bg-out td{opacity:0.25;}',
    '.bg-yes{color:var(--green);}',
    '.bg-noc{color:var(--dim);}',
    '.bg-slog{font-size:0.85rem;color:var(--muted);padding:0 0.15rem;}',
    '.bg-slog b{color:var(--green);}',
    '.bg-now{color:var(--gold);}',
    '.bg-ledger{font-size:0.85rem;color:var(--muted);max-height:150px;overflow-y:auto;}',
    '.bg-ledger .bg-le{display:flex;justify-content:space-between;gap:0.6rem;padding:0.2rem 0;',
    '  border-bottom:1px solid var(--surface2);}',
    '.bg-ledger .bg-le:last-child{border-bottom:none;}',
    '.bg-le .bg-leb{color:var(--cyan);font-variant-numeric:tabular-nums;white-space:nowrap;}',
    '.bg-ldiv{font-size:0.7rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--gold);padding:0.25rem 0 0.05rem;}',
    '.bg-fail{border:1px solid var(--red);border-radius:12px;padding:0.7rem 0.8rem;',
    '  background:rgba(248,113,113,0.06);display:flex;flex-direction:column;gap:0.6rem;}',
    '.bg-fail .bg-retry{align-self:flex-start;min-height:44px;}',
    '.bg-winp{display:flex;flex-direction:column;gap:0.7rem;border-color:var(--green)!important;}',
    '.bg-winp .bg-next{align-self:flex-start;min-height:44px;}',
    '.bg-lesson{font-size:0.95rem;line-height:1.55;}',
    '.bg-end{text-align:center;display:flex;flex-direction:column;gap:0.8rem;align-items:center;}',
    '.bg-muted{color:var(--muted);}',
    '.bg-sub{font-size:0.78rem;letter-spacing:0.04em;text-transform:uppercase;color:var(--dim);}'
  ].join('');
  document.head.appendChild(s);
}

// color a bits value: green near a full bit, fading through to dim
function bitsColor(b) {
  if (b >= 0.92) return 'var(--green)';
  if (b >= 0.6) return 'var(--cyan)';
  if (b >= 0.25) return 'var(--yellow)';
  return 'var(--dim)';
}
function fmtBits(b) { return b.toFixed(2); }

/* ------------------------------------------------------------------ */
/* mechanic                                                           */
/* ------------------------------------------------------------------ */

G.puzzles.register('binary-gate', {
  title: 'The Sorting Machine',

  /* pure-logic hooks for the node test harness; never used in-game */
  _test: {
    log2: log2, h2: h2, splitCounts: splitCounts, splitBits: splitBits,
    eliminate: eliminate, ceilLog2: ceilLog2, halvingChain: halvingChain,
    shortName: shortName, buildDecoys: buildDecoys, gateFail: gateFail,
    optWorst: optWorst,
  },

  create: function (root, config, api) {
    injectStyle();

    /* ---- frozen config in, internal working data out ---- */
    var rawItems = config.items || [];
    var N = rawItems.length;
    var labels = {}, cfgKeys = [];
    (function () {
      var src = config.traitLabels || {};
      for (var k in src) { labels[k] = src[k]; cfgKeys.push(k); }
    })();
    var perfect = ceilLog2(N);
    var decoys = buildDecoys(rawItems);
    var decoyIdx = {};                       // item index -> never the target
    decoys.forEach(function (d) { decoyIdx[d.idx] = true; labels[d.key] = d.label; });

    // working items: config traits + internal decoy traits (config untouched)
    var items = rawItems.map(function (it, i) {
      var t = {}, src = it.traits || {};
      for (var k in src) t[k] = !!src[k];
      decoys.forEach(function (d) { t[d.key] = (i === d.idx); });
      return { name: it.name, traits: t };
    });

    // short column heads for the strip-round trait table
    var heads = {};
    cfgKeys.forEach(function (k) { heads[k] = k; });
    decoys.forEach(function (d) { heads[d.key] = d.short; });

    /* per-letter budget: ⌈log₂N⌉, loosened only if the config's own traits
       genuinely cannot achieve it (or the island set a softer par). Both
       frozen configs: budget === parQuestions === ⌈log₂N⌉. */
    var needWorst = optWorst(items, cfgKeys);
    var par = config.parQuestions || 0;
    var budget = isFinite(needWorst) ? Math.max(perfect, par, needWorst) : Infinity;

    var stripKeys = decoys.map(function (d) { return d.key; }).concat(cfgKeys);

    var isTaught = G.pz.taught('binary-gate');
    var rounds = [];
    if (!isTaught) rounds.push({ kind: 'guide', label: 'watch the machine think' });
    rounds.push({ kind: 'strip', label: 'the machine goes quiet' });
    if (N >= 6 && isFinite(budget)) rounds.push({ kind: 'mastery', label: 'the morning batch' });

    var ladder = G.pz.hintLadder([
      'Count the ✓s in a column of the table. A question only pays a full bit ' +
        'when it splits the LIVING rows half-and-half.',
      'The “by name” slips split one row against all the rest — a sliver of a ' +
        'bit for a whole question. Start with a column that halves the pile instead.',
      'Walk it: skip every “by name” slip. Ask only the machine’s own sorting ' +
        'questions, in any order — each halves the pile (' + halvingChain(N) +
        ') and you land exactly on budget.',
    ]);

    /* ---- round state ---- */
    var phase, ri = 0, st = null, usedCfgTarget = false;

    function pickTarget(excludeDecoys) {
      if (st && st.kind === 'guide' && !usedCfgTarget &&
          typeof config.target === 'number' && rawItems[config.target]) {
        usedCfgTarget = true;
        return config.target;
      }
      var pool = [], i;
      for (i = 0; i < N; i++) if (!(excludeDecoys && decoyIdx[i])) pool.push(i);
      if (!pool.length) for (i = 0; i < N; i++) pool.push(i);
      return pool[Math.min(pool.length - 1, Math.floor(api.rng() * pool.length))];
    }

    function beginRound(i) {
      ri = i;
      var r = rounds[i];
      st = {
        kind: r.kind, label: r.label,
        letters: r.kind === 'mastery' ? 3 : 1,
        keys: r.kind === 'guide' ? cfgKeys.slice() : stripKeys.slice(),
        showBits: r.kind === 'guide',
        hasDecoys: r.kind !== 'guide' && decoys.length > 0,
        letterIdx: 0, spent: 0, spentLetter: 0,
        ledger: [], sortedLog: [], fail: null, win: null, coached: false,
      };
      st.budgetTotal = st.letters * budget;
      startLetter();
    }

    function startLetter() {
      st.alive = items.slice();
      st.asked = {};
      st.spentLetter = 0;
      st.target = pickTarget(st.hasDecoys);
    }

    // defensive only: can any unasked question still split the living set?
    function canSplitAlive() {
      for (var i = 0; i < st.keys.length; i++) {
        var k = st.keys[i];
        if (st.asked[k]) continue;
        var sc = splitCounts(st.alive, k);
        if (sc.yes > 0 && sc.no > 0) return true;
      }
      return false;
    }

    function askQuestion(key) {
      if (st.fail || st.win || st.asked[key]) return;
      var sc = splitCounts(st.alive, key);
      var bitsv = splitBits(sc.yes, sc.no);
      var ans = !!items[st.target].traits[key];
      st.asked[key] = true;
      st.spent++; st.spentLetter++;
      var before = st.alive.length;
      st.alive = eliminate(st.alive, key, ans);
      st.ledger.push({ letter: st.letterIdx, key: key, label: labels[key],
        answer: ans, bits: bitsv, yes: sc.yes, no: sc.no,
        kept: st.alive.length, of: before });
      api.sfx(ans ? 'select' : 'choice');
      if (st.kind === 'guide' && st.spent === 1) st.coached = true;

      var sorted = st.alive.length === 1 ||
        (st.alive.length > 1 && !canSplitAlive());  // inseparable-config guard
      if (sorted) { letterSorted(); return; }

      var lettersLeft = st.letters - st.letterIdx - 1;
      if (gateFail(st.spent, st.alive.length, budget, lettersLeft, st.budgetTotal)) {
        roundFailed();
        return;
      }
      render();
    }

    function letterSorted() {
      var name = st.alive.length === 1 ? st.alive[0].name : items[st.target].name;
      st.sortedLog.push({ name: name, q: st.spentLetter });
      if (st.letterIdx + 1 < st.letters) {
        st.letterIdx++;
        api.sfx('spark');
        startLetter();
        render();
        return;
      }
      ladder.reset();
      api.sfx('door');
      if (ri + 1 < rounds.length) {
        st.win = { name: name };
        render();
      } else {
        phase = 'debrief';
        G.pz.markTaught('binary-gate');
        render();
      }
    }

    function roundFailed() {
      api.sfx('fail');
      var worst = null;
      for (var i = 0; i < st.ledger.length; i++) {
        var e = st.ledger[i];
        if (!worst || e.bits < worst.bits) worst = e;
      }
      st.fail = { worst: worst, hint: ladder.fail() };
      render();
    }

    /* ---- DOM ---- */
    var wrap = document.createElement('div');
    wrap.className = 'bg-wrap';
    root.appendChild(wrap);

    function render() {
      wrap.innerHTML = '';
      if (phase === 'hook') { renderHook(); return; }
      if (phase === 'debrief') { renderDebrief(); return; }
      renderRound();
    }

    function renderHook() {
      api.status('a prediction first');
      var opts = [];
      if (perfect > 1) opts.push({ label: String(perfect - 1) });
      opts.push({ label: String(perfect) });
      if (N - 1 > perfect) opts.push({ label: String(N - 1), note: 'name by name' });
      if (opts.length < 2) opts.push({ label: String(perfect + 1) });
      var correct = (perfect > 1) ? 1 : 0;
      wrap.appendChild(G.pz.hookCard({
        question: N + ' addressees in the dead pile. How many yes/no questions ' +
          'ALWAYS sort a letter — even the unluckiest one?',
        options: opts,
        correct: correct,
        reveal: 'An answer can at best <b>halve</b> the pile: ' + halvingChain(N) +
          '. So <b>⌈log₂ ' + N + '⌉ = ' + perfect + '</b> questions always do it — ' +
          'and no certainty comes cheaper. Name by name could cost ' + (N - 1) + '.',
        onDone: function () { phase = 'round'; beginRound(0); render(); },
      }));
    }

    function renderRound() {
      api.status('round ' + (ri + 1) + '/' + rounds.length + ' · q ' + st.spent +
        '/' + st.budgetTotal + ' · pile ' + st.alive.length);
      wrap.appendChild(G.pz.roundBanner(ri + 1, rounds.length, st.label));
      wrap.appendChild(introCard());

      if (st.kind === 'guide' && st.coached) {
        wrap.appendChild(G.pz.coachCard('maren',
          'Half the pile gone in one stroke — <b>a whole bit</b>. The machine never ' +
          'cares what you asked; only how the answer split the pile.'));
      }

      if (st.kind === 'guide') renderChips();
      else { renderSortedLog(); renderTable(); }

      if (st.win) { renderWinPanel(); renderLedger(); return; }
      if (st.fail) { renderFailPanel(); renderLedger(); return; }

      if (st.kind === 'guide') {
        var readout = document.createElement('div');
        readout.className = 'bg-readout';
        readout.innerHTML = '<span class="bg-muted">Hover a question to see what it would buy.</span>';
        wrap.appendChild(readout);
        renderQuestions(readout);
      } else {
        renderQuestions(null);
      }
      renderMeter();
      renderLedger();
    }

    function introCard() {
      var d = document.createElement('div');
      d.className = 'bg-flavor g-card';
      if (st.kind === 'guide') {
        d.innerHTML = 'A letter waits in the hopper. Ask until one name remains. ' +
          '<span class="bg-muted">Budget: <b>⌈log₂ ' + N + '⌉ = ' + budget +
          '</b> question' + (budget === 1 ? '' : 's') +
          ' — every split is priced in bits before you spend.</span>';
      } else if (st.kind === 'strip') {
        d.innerHTML = 'The machine has gone quiet — no prices, no previews, just ' +
          'the sorting table. New slips lie on top of the pile. ' +
          '<span class="bg-muted">Budget: <b>' + budget + '</b> question' +
          (budget === 1 ? '' : 's') + '. A perfect question halves the pile: ' +
          halvingChain(N) + '.</span>';
      } else {
        d.innerHTML = 'The morning batch: <b>' + st.letters + ' letters</b>, one ' +
          'purse of <b>' + st.budgetTotal + ' questions</b>. ' +
          '<span class="bg-muted">Needed: ' + st.letters + ' × log₂ ' + N + ' = ' +
          G.pz.fmt(st.letters * log2(N)) +
          ' bits — and a yes/no answer never pays more than one bit.</span>';
      }
      return d;
    }

    function renderChips() {
      var card = document.createElement('div');
      card.className = 'g-card';
      var lab = document.createElement('div');
      lab.className = 'bg-sub';
      lab.textContent = 'Addressees';
      lab.style.marginBottom = '0.5rem';
      card.appendChild(lab);
      var chips = document.createElement('div');
      chips.className = 'bg-chips';
      var aliveSet = {};
      st.alive.forEach(function (it) { aliveSet[it.name] = true; });
      items.forEach(function (it) {
        var c = document.createElement('div');
        c.className = 'bg-chip' + (aliveSet[it.name] ? '' : ' bg-out');
        if (st.alive.length === 1 && st.alive[0].name === it.name) c.className += ' bg-win';
        c.textContent = it.name;
        chips.appendChild(c);
      });
      card.appendChild(chips);
      wrap.appendChild(card);
    }

    function renderTable() {
      var card = document.createElement('div');
      card.className = 'g-card';
      var lab = document.createElement('div');
      lab.className = 'bg-sub';
      lab.textContent = 'The sorting table';
      lab.style.marginBottom = '0.45rem';
      card.appendChild(lab);
      var twrap = document.createElement('div');
      twrap.className = 'bg-tablewrap';
      var tbl = document.createElement('table');
      tbl.className = 'bg-table';
      var aliveSet = {};
      st.alive.forEach(function (it) { aliveSet[it.name] = true; });
      var thead = document.createElement('tr');
      thead.appendChild(document.createElement('th'));
      st.keys.forEach(function (k) {
        var th = document.createElement('th');
        th.textContent = heads[k] || k;
        thead.appendChild(th);
      });
      tbl.appendChild(thead);
      items.forEach(function (it) {
        var tr = document.createElement('tr');
        if (!aliveSet[it.name]) tr.className = 'bg-out';
        var th = document.createElement('th');
        th.textContent = it.name;
        th.title = it.name;
        tr.appendChild(th);
        st.keys.forEach(function (k) {
          var td = document.createElement('td');
          var v = !!it.traits[k];
          td.textContent = v ? '✓' : '·';
          td.className = v ? 'bg-yes' : 'bg-noc';
          tr.appendChild(td);
        });
        tbl.appendChild(tr);
      });
      twrap.appendChild(tbl);
      card.appendChild(twrap);
      wrap.appendChild(card);
    }

    function renderSortedLog() {
      if (st.kind !== 'mastery') return;
      var d = document.createElement('div');
      d.className = 'bg-slog';
      var parts = [];
      for (var i = 0; i < st.letters; i++) {
        if (st.sortedLog[i]) {
          parts.push('<b>✓ ' + G.util.esc(st.sortedLog[i].name) + '</b> (' +
            st.sortedLog[i].q + 'q)');
        } else if (i === st.letterIdx && !st.win && !st.fail) {
          parts.push('<span class="bg-now">letter ' + (i + 1) + ' — sorting…</span>');
        } else {
          parts.push('<span class="bg-muted">letter ' + (i + 1) + '</span>');
        }
      }
      d.innerHTML = parts.join(' &nbsp;·&nbsp; ');
      wrap.appendChild(d);
    }

    function renderQuestions(readout) {
      var card = document.createElement('div');
      card.className = 'g-card';
      var lab = document.createElement('div');
      lab.className = 'bg-sub';
      lab.textContent = 'Questions';
      lab.style.marginBottom = '0.5rem';
      card.appendChild(lab);
      var list = document.createElement('div');
      list.className = 'bg-qlist';
      var remaining = st.keys.filter(function (k) { return !st.asked[k]; });
      remaining.forEach(function (key) {
        var b = document.createElement('button');
        b.className = 'bg-q';
        b.type = 'button';
        if (!st.showBits) {
          var tag = document.createElement('span');
          tag.className = 'bg-qtag';
          tag.textContent = heads[key] || key;
          b.appendChild(tag);
        }
        var txt = document.createElement('span');
        txt.className = 'bg-qtext';
        txt.textContent = labels[key];
        b.appendChild(txt);
        if (st.showBits) {
          var sc = splitCounts(st.alive, key);
          var bitsv = splitBits(sc.yes, sc.no);
          var bv = document.createElement('span');
          bv.className = 'bg-qbits';
          bv.textContent = '+' + fmtBits(bitsv) + ' bits';
          b.appendChild(bv);
          if (readout) {
            var preview = function () {
              readout.innerHTML = '<b>YES</b> keeps ' + sc.yes + ' · <b>NO</b> keeps ' +
                sc.no + ' — worth H₂(' +
                (sc.yes + sc.no ? (sc.yes / (sc.yes + sc.no)).toFixed(2) : '0') +
                ') = <b style="color:' + bitsColor(bitsv) + '">' + fmtBits(bitsv) +
                ' bits</b>';
            };
            b.addEventListener('mouseenter', preview);
            b.addEventListener('focus', preview);
          }
        }
        b.addEventListener('click', function () { askQuestion(key); });
        list.appendChild(b);
      });
      card.appendChild(list);
      wrap.appendChild(card);

      if (!remaining.length && st.alive.length > 1) {
        // unreachable with sane configs (the gate fires first); shrug guard
        var rb = document.createElement('button');
        rb.className = 'btn bg-retry';
        rb.type = 'button';
        rb.textContent = 'Reset letter';
        rb.addEventListener('click', function () { startLetter(); render(); });
        wrap.appendChild(rb);
      }
    }

    function renderMeter() {
      var d = document.createElement('div');
      d.className = 'bg-meter';
      if (st.kind === 'guide') {
        d.innerHTML = 'questions <b>' + st.spent + '</b> / ' + st.budgetTotal +
          ' · pile <b>' + st.alive.length + '</b> · perfect questions still ' +
          'needed: <b>' + ceilLog2(st.alive.length) + '</b>';
      } else if (st.kind === 'strip') {
        d.innerHTML = 'questions <b>' + st.spent + '</b> / ' + st.budgetTotal +
          ' · pile <b>' + st.alive.length + '</b>';
      } else {
        d.innerHTML = 'spent <b>' + st.spent + '</b> / ' + st.budgetTotal +
          ' questions · floor: ' + st.letters + ' × log₂ ' + N + ' = <b>' +
          G.pz.fmt(st.letters * log2(N)) + ' bits</b> · letters sorted <b>' +
          st.sortedLog.length + '</b> / ' + st.letters;
      }
      wrap.appendChild(d);
    }

    function renderLedger() {
      if (!st.ledger.length) return;
      var card = document.createElement('div');
      card.className = 'g-card';
      var lab = document.createElement('div');
      lab.className = 'bg-sub';
      lab.textContent = 'Ledger — ' + st.spent + ' question' +
        (st.spent === 1 ? '' : 's') + ' of ' + st.budgetTotal;
      lab.style.marginBottom = '0.4rem';
      card.appendChild(lab);
      var led = document.createElement('div');
      led.className = 'bg-ledger';
      var lastLetter = -1;
      st.ledger.forEach(function (e) {
        if (st.letters > 1 && e.letter !== lastLetter) {
          lastLetter = e.letter;
          var div = document.createElement('div');
          div.className = 'bg-ldiv';
          div.textContent = 'letter ' + (e.letter + 1);
          led.appendChild(div);
        }
        var row = document.createElement('div');
        row.className = 'bg-le';
        var q = document.createElement('span');
        q.textContent = e.label + '  →  ' + (e.answer ? 'YES' : 'NO');
        row.appendChild(q);
        var bb = document.createElement('span');
        bb.className = 'bg-leb';
        bb.textContent = st.showBits ? ('+' + fmtBits(e.bits) + ' bits')
                                     : ('kept ' + e.kept + ' of ' + e.of);
        row.appendChild(bb);
        led.appendChild(row);
      });
      card.appendChild(led);
      wrap.appendChild(card);
    }

    function renderWinPanel() {
      var d = document.createElement('div');
      d.className = 'bg-winp g-card';
      d.innerHTML = '<div class="bg-lesson">Sorted to <b style="color:var(--green)">' +
        G.util.esc(st.win.name) + '</b> — ' + st.spent + ' question' +
        (st.spent === 1 ? '' : 's') + ' of ' + st.budgetTotal +
        '. The gate creaks a notch.</div>';
      var b = document.createElement('button');
      b.className = 'btn btn-primary bg-next';
      b.type = 'button';
      b.textContent = 'Round ' + (ri + 2) + ' — ' + rounds[ri + 1].label;
      b.addEventListener('click', function () { beginRound(ri + 1); render(); });
      d.appendChild(b);
      wrap.appendChild(d);
    }

    function renderFailPanel() {
      var d = document.createElement('div');
      d.className = 'bg-fail';
      var w = st.fail.worst;
      var lines = [];
      if (w && w.bits < 0.95) {
        var minor = Math.min(w.yes, w.no), major = Math.max(w.yes, w.no);
        lines.push('“' + G.util.esc(w.label) + '” split the pile <b>' + minor +
          ' against ' + major + '</b> — worth h₂ = ' + fmtBits(w.bits) +
          ' bits, and you paid a whole question for it.');
      }
      var lettersLeft = st.letters - st.letterIdx - 1;
      var need = ceilLog2(st.alive.length) + lettersLeft * budget;
      lines.push('Spent <b>' + st.spent + '</b>; ' + st.alive.length + ' name' +
        (st.alive.length === 1 ? '' : 's') + ' still possible' +
        (lettersLeft ? ' and ' + lettersLeft + ' letter' +
          (lettersLeft === 1 ? '' : 's') + ' still waiting' : '') +
        ' — that takes at least ' + need + ' more perfect question' +
        (need === 1 ? '' : 's') + '. ' + st.spent + ' + ' + need + ' &gt; ' +
        st.budgetTotal + '. The letter is mis-sorted.');
      if (st.fail.hint) lines.push('<b>Hint:</b> ' + st.fail.hint);
      d.appendChild(G.pz.coachCard('maren', lines.join('<br>')));
      var b = document.createElement('button');
      b.className = 'btn btn-primary bg-retry';
      b.type = 'button';
      b.textContent = st.letters > 1 ? 'Take a fresh batch' : 'Take a fresh letter';
      b.addEventListener('click', function () { beginRound(ri); render(); });
      d.appendChild(b);
      wrap.appendChild(d);
    }

    function renderDebrief() {
      api.status('the gate is ready');
      var L = st.letters, k = st.spent;
      var bitsSum = 0;
      st.ledger.forEach(function (e) { bitsSum += e.bits; });
      var neededBits = L * log2(N);
      wrap.appendChild(G.pz.coachCard('maren',
        'Bits to pin one name out of ' + N + ' — log₂ ' + N + ' = ' +
        G.pz.fmt(log2(N)) + ' — that is the only coin this archipelago mints. ' +
        'You will spend it on every island.'));
      wrap.appendChild(G.pz.debriefCard({
        title: 'Every answer is at most one bit',
        html: 'You sorted <b>' + L + '</b> letter' + (L === 1 ? '' : 's') +
          ' in <b>' + k + '</b> question' + (k === 1 ? '' : 's') +
          '. Your ledger sums to <span class="pzk-eq">' + G.pz.fmt(bitsSum) +
          ' bits</span> — against <span class="pzk-eq">' + L + ' × log₂ ' + N +
          ' = ' + G.pz.fmt(neededBits) + ' bits</span> needed.<br>' +
          'A yes/no answer pays <b>at most one bit</b>, so ' + G.pz.fmt(neededBits) +
          ' bits can never cost fewer than ' + (L * perfect) +
          ' questions. Asking name by name risks ' + (N - 1) + ' per letter — ' +
          (L * (N - 1)) + ' in all. You paid ' + k + '.',
        buttonLabel: 'Open the gate',
        tone: 'win',
        onButton: function () { api.complete(); },
      }));
      api.sfx('door');
    }

    /* ---- boot ---- */
    if (N === 0) {
      wrap.innerHTML = '<p class="bg-flavor">The hopper is empty.</p>';
      api.status('');
    } else if (N === 1) {
      api.status('');
      var only = document.createElement('div');
      only.className = 'bg-end g-card';
      only.innerHTML = '<div class="bg-lesson">One addressee, zero doubt — ' +
        'log₂ 1 = 0 questions needed.</div>';
      var ob = document.createElement('button');
      ob.className = 'btn btn-primary';
      ob.type = 'button';
      ob.textContent = 'Open the gate';
      ob.addEventListener('click', function () { api.complete(); });
      only.appendChild(ob);
      wrap.appendChild(only);
    } else {
      phase = isTaught ? 'round' : 'hook';
      if (isTaught) beginRound(0);
      render();
    }

    return {
      destroy: function () { /* listeners die with the DOM; no timers */ }
    };
  }
});

})();
