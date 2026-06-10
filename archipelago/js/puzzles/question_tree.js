/* THE QUIET ARCHIPELAGO — 'question-tree' puzzle (The Dune of Surprises).
   Sift's critter catalogue: build the cheapest yes/no interrogation. Start with
   the whole critter set as the root; split any leaf of >=2 critters into a
   YES bucket and a NO bucket. When every leaf is a single critter you have a
   code; your expected questions (Sum p*depth) is compared live against the
   entropy floor H and against par. Beat par to file the catalogue.
   Teaches: every yes/no question is a bit; depth IS code length; no strategy
   averages below H.
   PEDAGOGY.md §6.4 teaching loop around the (unchanged) core mechanic:
   - HOOK: "can ANY strategy average fewer than H bits?" predict-then-reveal.
   - GUIDE: Sift reads the first-ever split preview aloud (once per session).
   - Codeword labels: finished leaves wear their YES/NO path as a 1/0 string;
     the meter shows avg questions = avg code length.
   - GATE: the existing par gate, now wired to a hint ladder on failures.
   - DEBRIEF: G.pz.debriefCard with the player's numbers, the head-count
     counterfactual, and the Huffman Wood foreshadow.
   - Taught-skip: repeat encounters skip the hook and the coach read-aloud.
   - An internal SKEWED second round exists ONLY for configs whose par a
     count-balanced tree could already beat (not the dunes config — verified
     by _smoke/pz_test_question-tree.mjs).
   Contract: ../../DESIGN.md · host: ../core/overlay.js (api = complete, fail,
   close, sfx, status, rng) · kit: ../core/pzkit.js (G.pz).
   IIFE, no globals; ends in G.puzzles.register. */
(function () {
'use strict';

/* ------- pure logic (tested by _smoke/pz_test_question-tree.mjs) ------- */

// A node is { critters:[...], yes:node|null, no:node|null }.
// Leaf when yes && no are null. Internal when both set.
function makeLeaf(critters) { return { critters: critters, yes: null, no: null }; }
function isLeaf(n) { return !n.yes && !n.no; }

function massOf(critters) {
  var m = 0;
  for (var i = 0; i < critters.length; i++) m += critters[i].p;
  return m;
}

// expected questions = Sum over single-critter leaves of p * depth,
// depth = number of internal (question) nodes above the leaf.
function expectedQuestions(root) {
  var total = 0;
  (function walk(n, depth) {
    if (isLeaf(n)) {
      for (var i = 0; i < n.critters.length; i++) total += n.critters[i].p * depth;
      return;
    }
    walk(n.yes, depth + 1);
    walk(n.no, depth + 1);
  })(root, 0);
  return total;
}

function allLeavesSingle(root) {
  var ok = true;
  (function walk(n) {
    if (isLeaf(n)) { if (n.critters.length !== 1) ok = false; return; }
    walk(n.yes); walk(n.no);
  })(root);
  return ok;
}

function entropy(critters) {
  var H = 0;
  for (var i = 0; i < critters.length; i++) {
    var p = critters[i].p;
    if (p > 0) H += p * (-Math.log2(p));
  }
  return H;
}

// info of a question = binary entropy of the YES/NO mass split.
function splitInfo(node) {
  var my = massOf(node.yes.critters), mn = massOf(node.no.critters);
  var tot = my + mn;
  if (tot <= 0) return 0;
  var q = my / tot;
  if (q <= 0 || q >= 1) return 0;
  return -(q * Math.log2(q) + (1 - q) * Math.log2(1 - q));
}

function countLeaves(root, onlyMulti) {
  var n = 0;
  (function walk(node) {
    if (isLeaf(node)) { if (!onlyMulti || node.critters.length >= 2) n++; return; }
    walk(node.yes); walk(node.no);
  })(root);
  return n;
}

function countSingles(root) {
  var n = 0;
  (function walk(node) {
    if (isLeaf(node)) { if (node.critters.length === 1) n++; return; }
    walk(node.yes); walk(node.no);
  })(root);
  return n;
}

// Every finished (single-critter) leaf with its YES/NO path written as 1/0.
function collectCodes(root) {
  var out = [];
  (function walk(n, path) {
    if (isLeaf(n)) {
      if (n.critters.length === 1) {
        out.push({ key: n.critters[0].key, p: n.critters[0].p, code: path });
      }
      return;
    }
    walk(n.yes, path + '1');
    walk(n.no, path + '0');
  })(root, '');
  return out;
}

// Optimal average depth (Huffman): sum of merged weights.
function huffmanCost(critters) {
  if (critters.length < 2) return 0;
  var w = critters.map(function (c) { return c.p; });
  var total = 0;
  while (w.length > 1) {
    w.sort(function (a, b) { return a - b; });
    var m = w.shift() + w.shift();
    total += m;
    w.push(m);
  }
  return total;
}

// Leaf depths of a tree built by splitting piles into equal HEAD-COUNT halves
// (ceil/floor). The profile is fixed by n alone.
function balancedDepths(n) {
  if (n <= 1) return [0];
  var a = balancedDepths(Math.ceil(n / 2)), b = balancedDepths(Math.floor(n / 2));
  var out = [], i;
  for (i = 0; i < a.length; i++) out.push(a[i] + 1);
  for (i = 0; i < b.length; i++) out.push(b[i] + 1);
  return out;
}

// Cheapest cost any count-balanced tree can reach: heaviest critters at the
// shallowest depths (rearrangement inequality). This is the kill-switch's
// best case — if even THIS misses par, head-count splitting can never pass.
function bestCountBalancedCost(critters) {
  var d = balancedDepths(critters.length).slice().sort(function (a, b) { return a - b; });
  var ps = critters.map(function (c) { return c.p; }).sort(function (a, b) { return b - a; });
  var total = 0;
  for (var i = 0; i < ps.length; i++) total += ps[i] * d[i];
  return total;
}

// The literally-lazy tree: count-balanced splits taking critters in listed
// order (first ceil(n/2) listed go YES).
function buildLazyCountTree(critters) {
  var node = makeLeaf(critters.slice());
  (function split(n) {
    if (n.critters.length < 2) return;
    var k = Math.ceil(n.critters.length / 2);
    n.yes = makeLeaf(n.critters.slice(0, k));
    n.no = makeLeaf(n.critters.slice(k));
    split(n.yes); split(n.no);
  })(node);
  return node;
}

// "Peel the likeliest": a chain of is-it-X questions, likeliest first.
// Equals the Huffman shape whenever each p_i covers the tail — true for both
// the dunes config and the internal skewed round (verified in the logic test).
function buildPeelTree(critters) {
  var sorted = critters.slice().sort(function (a, b) { return b.p - a.p; });
  var root = makeLeaf(sorted);
  var node = root;
  while (node.critters.length > 2) {
    node.yes = makeLeaf([node.critters[0]]);
    node.no = makeLeaf(node.critters.slice(1));
    node = node.no;
  }
  if (node.critters.length === 2) {
    node.yes = makeLeaf([node.critters[0]]);
    node.no = makeLeaf([node.critters[1]]);
  }
  return root;
}

// A second skewed round is warranted only when the config's par does NOT
// force probability-mass splits (a count-balanced tree could already pass).
function needsSkewedRound(critters, parAvg) {
  return critters.length >= 2 && bestCountBalancedCost(critters) <= parAvg + 1e-9;
}

function fmt(x) { return (Math.round(x * 100) / 100).toFixed(2); }
function pctMass(m) { return (Math.round(m * 1000) / 10) + '%'; }

/* Internal data for the conditional skewed round (never used by the dunes
   config — its par already blocks count-balanced trees). Huffman/peel cost
   1.68 <= par 1.85 < 2.00 = best count-balanced; H = 1.66. */
var SKEWED = {
  label: 'the lopsided pile',
  parAvg: 1.85,
  critters: [
    { name: 'Dust-hare',     p: 0.55, key: 'hare'  },
    { name: 'Sun-skink',     p: 0.22, key: 'skink' },
    { name: 'Mirage-moth',   p: 0.15, key: 'moth'  },
    { name: 'Pale Scorpion', p: 0.08, key: 'scorp' },
  ],
};

/* Sift's split-preview read-aloud happens at most once per browser session. */
var coachReadAloudShown = false;

/* ---------------- styles (prefix qt-) ---------------- */

var STYLE_ID = 'qt-style';
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  var s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent =
    '.qt-wrap{display:flex;flex-direction:column;gap:0.8rem;}' +
    '.qt-flavor{color:var(--muted);font-size:0.86rem;line-height:1.5;}' +
    '.qt-flavor b{color:var(--orange);font-weight:600;}' +
    '.qt-meter{font-size:0.86rem;}' +
    '.qt-meter .qt-line{display:flex;justify-content:space-between;gap:0.6rem;padding:0.18rem 0;}' +
    '.qt-meter .qt-line span:last-child{font-variant-numeric:tabular-nums;}' +
    '.qt-meter .qt-yours b{color:var(--yellow);}' +
    '.qt-meter .qt-floor b{color:var(--cyan);}' +
    '.qt-meter .qt-par b{color:var(--orange);}' +
    '.qt-meter .qt-yours.beat b{color:var(--green);}' +
    '.qt-meter .qt-codelen span:first-child{color:var(--muted);}' +
    '.qt-meter .qt-codelen b{color:var(--cyan);}' +
    '.qt-hint{color:var(--muted);font-size:0.8rem;margin-top:0.3rem;line-height:1.45;}' +
    '.qt-controls{display:flex;gap:0.6rem;flex-wrap:wrap;}' +
    '.qt-controls .btn{min-height:44px;}' +
    /* tree */
    '.qt-treebox{overflow-x:auto;padding:0.3rem 0.1rem;}' +
    '.qt-tree,.qt-tree ul{list-style:none;margin:0;padding:0;}' +
    '.qt-tree{display:flex;justify-content:center;min-width:max-content;margin:0 auto;}' +
    '.qt-node{display:flex;flex-direction:column;align-items:center;position:relative;padding-top:0.2rem;}' +
    '.qt-children{display:flex;gap:0.7rem;margin-top:0.9rem;position:relative;}' +
    '.qt-children:before{content:"";position:absolute;top:-0.5rem;left:50%;width:1px;height:0.5rem;background:var(--border);}' +
    '.qt-child{display:flex;flex-direction:column;align-items:center;position:relative;}' +
    '.qt-child:before{content:"";position:absolute;top:-0.5rem;left:50%;width:1px;height:0.5rem;background:var(--border);}' +
    '.qt-elbow{position:absolute;top:-0.5rem;height:1px;background:var(--border);}' +
    '.qt-edgelab{font-size:0.66rem;letter-spacing:0.05em;color:var(--dim);margin-bottom:0.15rem;text-transform:uppercase;}' +
    '.qt-edgelab.yes{color:var(--green);}' +
    '.qt-edgelab.no{color:var(--red);}' +
    /* internal question node */
    '.qt-q{border:1px solid var(--surface2);background:var(--surface);border-radius:10px;' +
      'padding:0.35rem 0.6rem;text-align:center;min-width:88px;}' +
    '.qt-q .qt-qmark{font-weight:700;color:var(--purple);font-size:1rem;}' +
    '.qt-q .qt-qinfo{font-size:0.68rem;color:var(--cyan);margin-top:0.1rem;}' +
    /* leaf set */
    '.qt-leaf{border:2px solid var(--surface2);background:var(--surface);border-radius:10px;' +
      'padding:0.4rem 0.55rem;min-width:96px;min-height:48px;text-align:center;color:var(--text);' +
      'cursor:default;transition:border-color .15s,background .15s;}' +
    '.qt-leaf.multi{cursor:pointer;border-color:var(--surface2);}' +
    '.qt-leaf.multi:hover{border-color:var(--purple);background:rgba(167,139,250,0.1);}' +
    '.qt-leaf.single{border-color:var(--green);}' +
    '.qt-leaf .qt-names{font-size:0.8rem;font-weight:600;line-height:1.25;}' +
    '.qt-leaf .qt-mass{font-size:0.68rem;color:var(--muted);margin-top:0.15rem;}' +
    '.qt-leaf .qt-code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:0.74rem;' +
      'color:var(--cyan);margin-top:0.18rem;letter-spacing:0.18em;}' +
    '.qt-leaf .qt-tap{font-size:0.64rem;color:var(--purple);margin-top:0.15rem;}' +
    /* split picker */
    '.qt-picker{border-color:var(--purple);}' +
    '.qt-picker h3{color:var(--purple);font-size:0.95rem;margin-bottom:0.5rem;}' +
    '.qt-picker .qt-pgrid{display:grid;gap:0.45rem;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:0.6rem;}' +
    '.qt-picker .pzk-coach{margin-bottom:0.6rem;}' +
    '.qt-pick{display:flex;align-items:center;gap:0.5rem;border:2px solid var(--surface2);border-radius:10px;' +
      'padding:0.5rem 0.6rem;background:var(--surface);color:var(--text);cursor:pointer;min-height:48px;text-align:left;}' +
    '.qt-pick.on{border-color:var(--green);background:rgba(52,211,153,0.12);}' +
    '.qt-pick .qt-box{width:18px;height:18px;border-radius:5px;border:2px solid var(--border);flex:0 0 auto;}' +
    '.qt-pick.on .qt-box{background:var(--green);border-color:var(--green);}' +
    '.qt-pick .qt-pn{font-size:0.85rem;font-weight:600;}' +
    '.qt-pick .qt-pp{font-size:0.7rem;color:var(--muted);}' +
    '.qt-psum{font-size:0.78rem;color:var(--muted);margin-bottom:0.6rem;min-height:1rem;}' +
    '.qt-psum b{color:var(--cyan);}' +
    '.qt-prow{display:flex;gap:0.6rem;flex-wrap:wrap;}' +
    '.qt-prow .btn{min-height:44px;}' +
    /* over-par result card */
    '.qt-over p{color:var(--muted);font-size:0.85rem;line-height:1.5;margin:0;}' +
    '.qt-over b{color:var(--orange);}';
  document.head.appendChild(s);
}

/* ---------------- mechanic ---------------- */

G.puzzles.register('question-tree', {
  title: 'The Critter Catalogue',
  /* exposed for the node logic test only — the engine reads title/create */
  _logic: {
    makeLeaf: makeLeaf, isLeaf: isLeaf, massOf: massOf,
    expectedQuestions: expectedQuestions, allLeavesSingle: allLeavesSingle,
    entropy: entropy, splitInfo: splitInfo, collectCodes: collectCodes,
    huffmanCost: huffmanCost, balancedDepths: balancedDepths,
    bestCountBalancedCost: bestCountBalancedCost,
    buildLazyCountTree: buildLazyCountTree, buildPeelTree: buildPeelTree,
    needsSkewedRound: needsSkewedRound, SKEWED: SKEWED,
  },
  create: function (root, config, api) {
    injectStyle();

    function copyCritter(c) { return { name: c.name, p: c.p, key: c.key }; }

    var baseCritters = (config.critters || []).map(copyCritter);
    var basePar = (typeof config.parAvg === 'number') ? config.parAvg
      : huffmanCost(baseCritters) + 0.35;
    var isTaught = G.pz.taught('question-tree');

    // The config parameterizes the mastery round. An internal SKEWED round is
    // appended ONLY when the config's par doesn't force mass-splits, and only
    // on the first (teaching) encounter — taught replays go straight to the
    // config round (PEDAGOGY §1.8).
    var rounds = [{
      critters: baseCritters, parAvg: basePar, label: 'the catalogue',
      flavor: 'Sift drags out a battered card box. <b>"Every critter, sorted by one ' +
        'yes/no question at a time. Tap a pile of two or more to split it. Cheapest ' +
        'set of questions wins &mdash; ask the wrong ones and you\'ll feel the cost."</b>',
    }];
    if (!isTaught && needsSkewedRound(baseCritters, basePar)) {
      rounds.push({
        critters: SKEWED.critters.map(copyCritter), parAvg: SKEWED.parAvg, label: SKEWED.label,
        flavor: 'Sift tips out a second, lumpier box. <b>"Same trick, wilder odds. ' +
          'Head-count will lie to you here &mdash; follow the mass."</b>',
      });
    }

    // round state (reassigned by startRound)
    var critters, parAvg, H, tree, history, ladder;
    var roundIdx = 0, won = false, wasSolved = false;

    // round DOM (rebuilt by startRound)
    var meter, undoBtn, clearBtn, treeBox, slot;
    var hintEl = null, resultEl = null;

    var wrap = document.createElement('div');
    wrap.className = 'qt-wrap';
    root.appendChild(wrap);

    function el(tag, cls, html) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (html != null) n.innerHTML = html;
      return n;
    }

    /* ---- HOOK (skipped on repeat encounters) ---- */
    function showHook() {
      var Hh = entropy(baseCritters);
      var hook = G.pz.hookCard({
        question: 'Sift\'s pile holds H = ' + fmt(Hh) + ' bits of doubt. Can ANY ' +
          'yes/no question strategy average <i>fewer</i> than H questions?',
        options: [{ label: 'Yes' }, { label: 'No' }],
        correct: 1,
        reveal: 'No strategy can &mdash; a yes/no answer carries at most <b>one bit</b>, ' +
          'so no average dips below H = ' + fmt(Hh) + '. The floor is real; let\'s see ' +
          'how close you can build to it.',
        onDone: function () { startRound(0); },
      });
      wrap.appendChild(hook);
    }

    /* ---- hint ladder content (PEDAGOGY §1.7, wired to par failures) ---- */
    function buildHints() {
      var order = critters.slice().sort(function (a, b) { return b.p - a.p; });
      var top = order[0];
      var chain = order.slice(0, Math.max(1, order.length - 1)).map(function (c) {
        return '<b>' + G.util.esc(c.name) + '?</b>';
      }).join(' then ');
      return [
        '"Cheaper means splitting the probability <b>MASS</b> evenly &mdash; not the ' +
          'head-count. One common critter can outweigh three rare ones."',
        '"Try peeling: make a question <b>Is it the ' + G.util.esc(top.name) +
          '?</b> all by itself &mdash; ' + pctMass(top.p) +
          ' of the time you\'re done after one question."',
        '"Walk it with me: ask ' + chain + ', one peel per question, likeliest first. ' +
          'Rare critters get long trails, common ones short &mdash; that tree averages ' +
          fmt(expectedQuestions(buildPeelTree(critters))) + ', under par."',
      ];
    }

    /* ---- round setup ---- */
    function startRound(i) {
      roundIdx = i;
      var r = rounds[i];
      critters = r.critters.map(copyCritter);
      parAvg = r.parAvg;
      H = entropy(critters);
      tree = makeLeaf(critters.slice());
      history = [];
      wasSolved = false;
      hintEl = null;
      resultEl = null;
      ladder = G.pz.hintLadder(buildHints());

      wrap.innerHTML = '';
      if (rounds.length > 1) wrap.appendChild(G.pz.roundBanner(i + 1, rounds.length, r.label));
      wrap.appendChild(el('div', 'qt-flavor', r.flavor));

      meter = el('div', 'g-card qt-meter');
      wrap.appendChild(meter);

      var controls = el('div', 'qt-controls');
      undoBtn = el('button', 'btn', 'Undo'); undoBtn.type = 'button';
      clearBtn = el('button', 'btn', 'Clear'); clearBtn.type = 'button';
      controls.appendChild(undoBtn);
      controls.appendChild(clearBtn);
      wrap.appendChild(controls);

      treeBox = el('div', 'qt-treebox');
      wrap.appendChild(treeBox);

      slot = el('div');
      wrap.appendChild(slot);

      undoBtn.addEventListener('click', function () {
        if (won || history.length === 0) return;
        var node = history.pop();
        node.yes = null;
        node.no = null;
        slot.innerHTML = '';
        api.sfx('close');
        renderTree();
        refreshMeter();
      });
      clearBtn.addEventListener('click', function () {
        if (won) return;
        tree = makeLeaf(critters.slice());
        history = [];
        slot.innerHTML = '';
        api.sfx('close');
        renderTree();
        refreshMeter();
      });

      renderTree();
      refreshMeter();
    }

    /* ---- render the tree as nested DOM (path carries the 1/0 codeword) ---- */
    function renderTree() {
      treeBox.innerHTML = '';
      var rootWrap = el('div', 'qt-tree');
      rootWrap.appendChild(renderNode(tree, ''));
      treeBox.appendChild(rootWrap);
    }

    function renderNode(node, path) {
      var box = el('div', 'qt-node');
      if (isLeaf(node)) {
        box.appendChild(renderLeaf(node, path));
        return box;
      }
      var q = el('div', 'qt-q',
        '<div class="qt-qmark">?</div>' +
        '<div class="qt-qinfo">' + fmt(splitInfo(node)) + ' bits</div>');
      box.appendChild(q);

      var kids = el('div', 'qt-children');
      kids.appendChild(renderChild(node.yes, 'YES', path + '1'));
      kids.appendChild(renderChild(node.no, 'NO', path + '0'));
      box.appendChild(kids);
      return box;
    }

    function renderChild(node, label, path) {
      var c = el('div', 'qt-child');
      var lab = el('div', 'qt-edgelab ' + (label === 'YES' ? 'yes' : 'no'), label);
      c.appendChild(lab);
      c.appendChild(renderNode(node, path));
      return c;
    }

    function renderLeaf(node, path) {
      var multi = node.critters.length >= 2;
      var single = node.critters.length === 1;
      var leaf = document.createElement(multi ? 'button' : 'div');
      leaf.className = 'qt-leaf ' + (multi ? 'multi' : 'single');
      if (multi) leaf.type = 'button';
      var names = node.critters.map(function (c) { return G.util.esc(c.name); }).join(', ');
      leaf.innerHTML =
        '<div class="qt-names">' + names + '</div>' +
        '<div class="qt-mass">mass ' + pctMass(massOf(node.critters)) + '</div>' +
        (single && path ? '<div class="qt-code">' + path + '</div>' : '') +
        (multi ? '<div class="qt-tap">tap to split</div>' : '');
      if (multi) {
        leaf.addEventListener('click', function () {
          if (won) return;
          openPicker(node);
        });
      }
      return leaf;
    }

    /* ---- split picker (with Sift's one-time read-aloud) ---- */
    function openPicker(node) {
      slot.innerHTML = '';
      var box = el('div', 'g-card qt-picker', '<h3>Split this pile: which go to YES?</h3>');

      var grid = el('div', 'qt-pgrid');
      var chosen = {}; // key -> bool
      node.critters.forEach(function (c) {
        var b = el('button', 'qt-pick',
          '<span class="qt-box"></span>' +
          '<span><span class="qt-pn">' + G.util.esc(c.name) + '</span> ' +
          '<span class="qt-pp">' + pctMass(c.p) + '</span></span>');
        b.type = 'button';
        b.addEventListener('click', function () {
          chosen[c.key] = !chosen[c.key];
          b.classList.toggle('on', !!chosen[c.key]);
          updateSummary();
          api.sfx('select');
        });
        grid.appendChild(b);
      });
      box.appendChild(grid);

      var summary = el('div', 'qt-psum');
      box.appendChild(summary);

      var coachEl = null; // Sift reads the very first valid split preview aloud

      var row = el('div', 'qt-prow');
      var doBtn = el('button', 'btn btn-primary', 'Split'); doBtn.type = 'button';
      var cancelBtn = el('button', 'btn btn-ghost', 'Cancel'); cancelBtn.type = 'button';
      row.appendChild(doBtn);
      row.appendChild(cancelBtn);
      box.appendChild(row);
      slot.appendChild(box);
      box.scrollIntoView({ block: 'nearest' });

      function yesList() { return node.critters.filter(function (c) { return chosen[c.key]; }); }
      function noList() { return node.critters.filter(function (c) { return !chosen[c.key]; }); }
      function readAloud(q, info) {
        var pct = Math.round(q * 100);
        if (Math.abs(q - 0.5) <= 0.1) {
          return '"' + pct + '% YES &mdash; nearly a coin flip, nearly a whole bit: <b>' +
            fmt(info) + ' bits</b>. That question earns its keep."';
        }
        return '"' + pct + '% YES &mdash; lopsided. A nearly-sure answer barely surprises, ' +
          'so it barely informs: only <b>' + fmt(info) + ' bits</b>."';
      }
      function updateSummary() {
        var y = yesList(), n = noList();
        var ok = y.length >= 1 && n.length >= 1;
        var info = 0, q = 0;
        if (y.length === 0 && n.length === node.critters.length) {
          summary.innerHTML = 'Pick at least one critter for YES (the rest go NO).';
        } else if (!ok) {
          summary.innerHTML = 'Both sides must be non-empty &mdash; un-pick one for NO.';
        } else {
          var my = massOf(y), mn = massOf(n), tot = my + mn;
          q = my / tot;
          info = (q <= 0 || q >= 1) ? 0 : -(q * Math.log2(q) + (1 - q) * Math.log2(1 - q));
          summary.innerHTML = 'YES: ' + y.length + ' (mass ' + pctMass(my) + ') &middot; ' +
            'NO: ' + n.length + ' (mass ' + pctMass(mn) + ') &middot; this question carries <b>' +
            fmt(info) + ' bits</b>.';
        }
        if (ok) {
          if (!coachEl && !isTaught && !coachReadAloudShown) {
            coachReadAloudShown = true;
            coachEl = G.pz.coachCard('sift', readAloud(q, info));
            box.insertBefore(coachEl, row);
          } else if (coachEl) {
            coachEl.querySelector('.pzk-ctext').innerHTML = readAloud(q, info);
          }
        }
        doBtn.disabled = !ok;
      }
      updateSummary();

      doBtn.addEventListener('click', function () {
        var y = yesList(), n = noList();
        if (y.length < 1 || n.length < 1) return;
        node.yes = makeLeaf(y);
        node.no = makeLeaf(n);
        history.push(node);
        slot.innerHTML = '';
        api.sfx('open');
        renderTree();
        refreshMeter();
      });
      cancelBtn.addEventListener('click', function () {
        slot.innerHTML = '';
        api.sfx('close');
      });
    }

    /* ---- meter + win detection (THE PAR GATE — unchanged predicate) ---- */
    function refreshMeter() {
      var solved = allLeavesSingle(tree);
      var leavesLeft = countLeaves(tree, true); // multi-critter leaves remaining

      if (solved) {
        var eq = expectedQuestions(tree);
        var beat = eq <= parAvg + 1e-9;
        meter.innerHTML =
          '<div class="qt-line qt-yours' + (beat ? ' beat' : '') + '"><span>Your tree</span>' +
          '<span><b>' + fmt(eq) + '</b> avg questions</span></div>' +
          '<div class="qt-line qt-codelen"><span>= avg code length</span>' +
          '<span><b>' + fmt(eq) + '</b> bits &mdash; the 1/0 trail on each leaf</span></div>' +
          '<div class="qt-line qt-floor"><span>Floor (entropy)</span><span>H = <b>' + fmt(H) + '</b> bits</span></div>' +
          '<div class="qt-line qt-par"><span>Target</span><span>&le; <b>' + fmt(parAvg) + '</b></span></div>';
        if (beat) {
          meter.innerHTML += '<div class="qt-hint">You beat par. No yes/no strategy can do better than H = ' +
            fmt(H) + ' bits &mdash; you are close to the floor.</div>';
          ladder.reset();
          clearHint();
        } else {
          meter.innerHTML += '<div class="qt-hint">Above target. Undo and ask questions that split the ' +
            'probability mass more evenly &mdash; or peel the likeliest critter off first.</div>';
          if (!wasSolved) { // count each completed-over-par tree as ONE gate failure
            var hint = ladder.fail();
            if (hint) showHint(hint);
          }
        }
        showResult(beat, eq);
      } else {
        meter.innerHTML =
          '<div class="qt-line"><span>Tree</span><span>' + leavesLeft +
          ' pile' + (leavesLeft === 1 ? '' : 's') + ' still to split</span></div>' +
          '<div class="qt-line qt-floor"><span>Floor (entropy)</span><span>H = <b>' + fmt(H) + '</b> bits</span></div>' +
          '<div class="qt-line qt-par"><span>Target</span><span>&le; <b>' + fmt(parAvg) + '</b> avg questions</span></div>' +
          '<div class="qt-hint">Keep splitting until every pile is a single critter' +
          (countSingles(tree) > 0
            ? ' &mdash; finished critters wear their <b>codeword</b>: the YES/NO trail, written in 1/0.'
            : ', then the score appears.') +
          '</div>';
        clearResult();
      }

      // live status line
      var statusTail = solved
        ? 'avg ' + fmt(expectedQuestions(tree)) + ' q = code length'
        : leavesLeft + ' pile' + (leavesLeft === 1 ? '' : 's') + ' to split';
      api.status(statusTail + ' &middot; floor H = ' + fmt(H) + ' &middot; target &le; ' + fmt(parAvg));

      undoBtn.disabled = history.length === 0;
      clearBtn.disabled = history.length === 0;
      wasSolved = solved;
    }

    /* ---- failure hints (coach card under the meter) ---- */
    function clearHint() {
      if (hintEl && hintEl.parentNode) hintEl.parentNode.removeChild(hintEl);
      hintEl = null;
    }
    function showHint(text) {
      clearHint();
      hintEl = G.pz.coachCard('sift', text);
      meter.parentNode.insertBefore(hintEl, meter.nextSibling);
      api.sfx('talk');
    }

    /* ---- result card: over-par notice / interim card / DEBRIEF ---- */
    function clearResult() {
      if (resultEl && resultEl.parentNode) resultEl.parentNode.removeChild(resultEl);
      resultEl = null;
    }
    function showResult(beat, eq) {
      clearResult();
      if (!beat) {
        resultEl = el('div', 'g-card qt-over',
          '<p>A complete tree &mdash; but it asks ' + fmt(eq) + ' questions on average, over the ' +
          'target of ' + fmt(parAvg) + '. Sift wants it cheaper. <b>Undo</b> and try splitting ' +
          'the mass more evenly.</p>');
        wrap.appendChild(resultEl);
        resultEl.scrollIntoView({ block: 'nearest' });
        return;
      }
      var last = roundIdx === rounds.length - 1;
      if (!last) {
        resultEl = G.pz.debriefCard({
          tone: 'info',
          title: 'Filed — but Sift is not done.',
          html: 'Your tree averages <span class="pzk-eq">' + fmt(eq) + '</span> questions ' +
            'against a floor of H = <span class="pzk-eq">' + fmt(H) + '</span>. ' +
            '<b>"Good. Now a lumpier pile &mdash; head-count will lie to you. Follow the mass."</b>',
          buttonLabel: 'Next pile',
          onButton: function () {
            api.sfx('open');
            startRound(roundIdx + 1);
          },
        });
      } else {
        var naive = bestCountBalancedCost(critters);
        resultEl = G.pz.debriefCard({
          tone: 'win',
          title: '✓ A code, built by hand.',
          html: 'Every yes/no question is a <b>bit</b>, and every YES/NO trail is a ' +
            '<b>codeword</b>: depth is code length, so your interrogation averages ' +
            '<span class="pzk-eq">' + fmt(eq) + '</span> questions = ' +
            '<span class="pzk-eq">' + fmt(eq) + '</span> bits per critter. No strategy ' +
            'averages below the entropy <span class="pzk-eq">H = ' + fmt(H) + '</span>, ' +
            'and splitting piles by head-count instead of mass would have cost at least ' +
            '<span class="pzk-eq">' + fmt(naive) + '</span>. You just built a code.' +
            '<br><br>Sift taps the box shut. <b>"These trees grow wild in a wood west of ' +
            'here &mdash; the trails ARE the codes."</b>',
          buttonLabel: 'File the catalogue',
          onButton: function () {
            if (won) return;
            won = true;
            G.pz.markTaught('question-tree');
            api.complete();
          },
        });
      }
      wrap.appendChild(resultEl);
      resultEl.scrollIntoView({ block: 'nearest' });
    }

    /* ---- kick off: taught players skip the hook entirely ---- */
    if (isTaught) startRound(0); else showHook();

    return {
      destroy: function () { /* no global timers/listeners to clean up */ }
    };
  }
});

})();
