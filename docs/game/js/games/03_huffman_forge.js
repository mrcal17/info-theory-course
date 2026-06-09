/* SIGNAL LOST — minigame 03: "The Forge" (huffman-forge).
   The station's encoder is slag. Reforge a prefix code by merging nodes —
   you pick the two to merge, so bad choices cost bits. Contract: ../DESIGN.md. */
(function () {
'use strict';

/* ============================== pure math ==============================
   All game math is here as side-effect-free functions so it can be reviewed
   and tested in isolation. Probabilities are passed as plain number arrays. */

// Shannon entropy in bits: H = -Σ pᵢ log₂ pᵢ  (terms with p=0 contribute 0).
function entropy(probs) {
  var h = 0;
  for (var i = 0; i < probs.length; i++) {
    var p = probs[i];
    if (p > 0) h -= p * Math.log2(p);
  }
  return h;
}

// Correct Huffman: repeatedly merge the two LEAST-probable live nodes.
// Returns codeword lengths per symbol, in the original symbol order.
// Pure: builds its own working set, never mutates the input.
function huffmanLengths(weights) {
  var n = weights.length;
  if (n === 0) return [];
  if (n === 1) return [1]; // a single symbol still needs one bit to send.

  // Each node: { w, depth, leaf? index, left, right }. Leaves carry index.
  var nodes = [];
  var i;
  for (i = 0; i < n; i++) nodes.push({ w: weights[i], idx: i, left: null, right: null });

  var live = nodes.slice();
  while (live.length > 1) {
    // Find the two minimum-weight nodes (min-by-weight selection).
    var a = 0, b = -1;
    for (i = 1; i < live.length; i++) if (live[i].w < live[a].w) a = i;
    for (i = 0; i < live.length; i++) {
      if (i === a) continue;
      if (b < 0 || live[i].w < live[b].w) b = i;
    }
    var nodeA = live[a], nodeB = live[b];
    var parent = { w: nodeA.w + nodeB.w, idx: -1, left: nodeA, right: nodeB };
    // Remove the two children (remove larger index first to keep indices valid).
    var hi = Math.max(a, b), lo = Math.min(a, b);
    live.splice(hi, 1);
    live.splice(lo, 1);
    live.push(parent);
  }

  // Walk the finished tree to read off leaf depths = codeword lengths.
  var lengths = new Array(n).fill(0);
  (function walk(node, depth) {
    if (!node.left && !node.right) { lengths[node.idx] = depth; return; }
    if (node.left) walk(node.left, depth + 1);
    if (node.right) walk(node.right, depth + 1);
  })(live[0], 0);
  return lengths;
}

// Expected codeword length L̄ = Σ pᵢ ℓᵢ.
function avgLength(probs, lengths) {
  var L = 0;
  for (var i = 0; i < probs.length; i++) L += probs[i] * lengths[i];
  return L;
}

// Encode a word (array of symbol indices) into a bitstring using a code map
// (object: index -> codeword string). Returns the concatenated bits.
function encode(indices, codeMap) {
  var out = '';
  for (var i = 0; i < indices.length; i++) out += codeMap[indices[i]];
  return out;
}

/* ============================ round content ============================
   Each round: symbol labels + probabilities (sum to 1) + a sample word
   (array of label characters). Round 3 is dyadic so L* = H exactly. */
var ROUNDS = [
  {
    title: 'Warm-up coils',
    note: 'Five symbols, mildly skewed.',
    syms: ['A', 'B', 'C', 'D', 'E'],
    probs: [0.30, 0.25, 0.20, 0.15, 0.10],
    sample: 'CABED',
    dyadic: false,
  },
  {
    title: 'Skewed feed',
    note: 'Six symbols, strongly skewed — lean on the common ones.',
    syms: ['E', 'T', 'A', 'O', 'N', 'S'],
    probs: [0.40, 0.25, 0.15, 0.10, 0.06, 0.04],
    sample: 'TEAES',
    dyadic: false,
  },
  {
    title: 'Dyadic core',
    note: 'Eight symbols, every probability a power of two.',
    syms: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    // 1/2, 1/4, 1/8, 1/16, 1/32, 1/64, 1/128, 1/128 → sums to exactly 1.
    probs: [1 / 2, 1 / 4, 1 / 8, 1 / 16, 1 / 32, 1 / 64, 1 / 128, 1 / 128],
    sample: 'ABACA',
    dyadic: true,
  },
];

var STYLE = [
  '.hf-wrap{display:flex;flex-direction:column;gap:0.9rem;}',
  '.hf-banner{font-size:0.85rem;line-height:1.5;color:var(--muted);}',
  '.hf-banner b{color:var(--text);}',
  '.hf-section-label{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.15em;',
  '  color:var(--dim);font-weight:700;margin-bottom:0.3rem;}',
  '.hf-free{display:flex;flex-wrap:wrap;gap:0.5rem;min-height:46px;}',
  '.hf-card{display:flex;flex-direction:column;align-items:center;justify-content:center;',
  '  min-width:64px;min-height:46px;padding:0.4rem 0.6rem;border:2px solid var(--surface2);',
  '  border-radius:10px;background:var(--surface);cursor:pointer;transition:all 0.12s;',
  '  line-height:1.15;text-align:center;}',
  '.hf-card:hover{border-color:var(--purple);}',
  '.hf-card.hf-sel{border-color:var(--purple);background:#2a2342;',
  '  box-shadow:0 0 0 2px rgba(167,139,250,0.35);}',
  '.hf-card .hf-w{font-size:0.7rem;color:var(--muted);}',
  '.hf-card .hf-lab{font-weight:700;font-size:0.95rem;color:var(--text);}',
  '.hf-card.hf-internal .hf-lab{font-size:0.78rem;color:var(--purple);letter-spacing:0.02em;}',
  '.hf-actions{display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center;}',
  '.hf-actions .btn{min-height:40px;}',
  '.hf-treepanel{overflow-x:auto;padding:0.4rem 0.2rem;}',
  '.hf-forest{display:flex;gap:1.2rem;align-items:flex-start;min-width:min-content;padding:0.2rem;}',
  '.hf-node{display:flex;flex-direction:column;align-items:center;}',
  '.hf-leaf,.hf-inode{border:1.5px solid var(--surface2);border-radius:8px;background:var(--surface);',
  '  padding:0.25rem 0.5rem;font-size:0.8rem;white-space:nowrap;text-align:center;line-height:1.2;}',
  '.hf-leaf{border-color:var(--blue);}',
  '.hf-inode{border-color:var(--purple);color:var(--muted);font-size:0.72rem;}',
  '.hf-leaf b{color:var(--text);}',
  '.hf-kids{display:flex;gap:0.8rem;align-items:flex-start;position:relative;',
  '  padding-top:0.7rem;margin-top:0.5rem;}',
  '.hf-branch{display:flex;flex-direction:column;align-items:center;position:relative;}',
  '.hf-branch::before{content:"";position:absolute;top:-0.7rem;width:2px;height:0.7rem;',
  '  background:var(--border);}',
  '.hf-bit{position:absolute;top:-1.25rem;font-size:0.66rem;font-weight:700;color:var(--cyan);}',
  '.hf-table{width:100%;border-collapse:collapse;font-size:0.82rem;}',
  '.hf-table td,.hf-table th{padding:0.3rem 0.5rem;border-bottom:1px solid var(--surface2);text-align:left;}',
  '.hf-table th{color:var(--dim);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;}',
  '.hf-table code{font-size:0.82em;}',
  '.hf-metrics{display:flex;flex-wrap:wrap;gap:0.5rem;font-size:0.82rem;}',
  '.hf-roundbtn{margin-top:0.4rem;}',
  '.hf-hint{font-size:0.78rem;color:var(--dim);line-height:1.5;}',
  '.hf-floor{color:var(--green);font-weight:600;}',
  '.hf-bits{font-family:ui-monospace,Consolas,monospace;font-size:0.8rem;word-break:break-all;}',
].join('\n');

Game.register({
  id: 'huffman-forge',
  title: 'The Forge',
  icon: '⚒️',
  part: 2,
  module: '2B',
  moduleTitle: 'Huffman Coding',
  moduleUrl: '../2b_huffman/',
  tagline: 'Hammer symbols into a prefix code, merge by merge.',
  briefing:
    '<p>The relay’s entropy encoder is slag. The codebook it once forged ' +
    'is gone, and every byte you ship now wastes the channel. Reforge it the only ' +
    'way it can be done: take the two faintest signals, weld them under one node, ' +
    'and repeat until a single tree remains. Pick well and the code sings; pick ' +
    'badly and you pay in bits.</p>' +
    '<ul>' +
    '<li>Click two cards in the working row to select them, then <b>Merge</b> ' +
    '(weights add; a new internal node appears).</li>' +
    '<li><b>Undo</b> peels back your last merge. Keep merging until one root is left.</li>' +
    '<li>Then read the verdict: your average length L̄ against the true ' +
    'optimum L* and the entropy floor H.</li>' +
    '<li>Three rounds, harder each time. Always weld the two <i>least</i> probable.</li>' +
    '</ul>',
  concept:
    '<p>A <b>prefix code</b> gives every symbol a codeword such that none is a ' +
    'prefix of another — so a bitstream decodes with no separators. Huffman’s ' +
    'rule builds the optimal one greedily: repeatedly merge the two <i>least</i> ' +
    'probable nodes. That greedy merge is provably optimal among all symbol codes; ' +
    'any other pairing can only lengthen the expected codeword.</p>' +
    '<p>The expected length obeys <b>H(X) ≤ L* &lt; H(X) + 1</b>, where ' +
    'H(X) = −Σ pᵢ log₂ pᵢ. Equality L* = H holds <i>iff</i> ' +
    'every probability is a power of two (a dyadic source) — only then can integer ' +
    'codeword lengths sit exactly on the entropy floor.</p>',

  create: function (root, api) {
    api.injectStyle(STYLE);

    /* ---- all mutable state lives here, rebuilt every create() (replay-safe) ---- */
    var roundIdx = 0;
    var results = [];          // per-round { Lbar, Lstar, H, excess }
    var done = false;          // guards api.complete to fire once
    var timers = [];           // any setTimeout ids, cleared in destroy()

    // Per-round working state (reset by startRound):
    var nodes = [];            // live forest roots: {id,label,w,leaf,symIdx,left,right}
    var nodeSeq = 0;
    var selected = [];         // ids of currently selected cards
    var history = [];          // stack of snapshots for full undo
    var round = null;          // active ROUNDS entry
    var finished = false;      // round merged down to one root

    var wrap = document.createElement('div');
    wrap.className = 'hf-wrap';
    root.appendChild(wrap);

    /* ---- small DOM helper ---- */
    function mk(tag, cls, html) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (html != null) n.innerHTML = html;
      return n;
    }

    function setStatus() {
      var merges = nodes.length > 1 ? (nodes.length - 1) : 0;
      var lbar = '';
      if (finished && round) {
        var lengths = leafLengths();
        var Lbar = avgLength(round.probs, lengths);
        lbar = ' · L̄ ' + Lbar.toFixed(3);
      }
      api.status('Round ' + (roundIdx + 1) + '/3 · ' + merges + ' merge' +
        (merges === 1 ? '' : 's') + ' left' + lbar);
    }

    /* ---- snapshot / restore for undo (deep-ish copy of node graph) ---- */
    function snapshot() {
      // Shallow-clone each node; left/right hold object refs, so clone the whole
      // set keyed by id and re-link to keep the graph independent of the live one.
      var map = {};
      function clone(node) {
        if (!node) return null;
        if (map[node.id]) return map[node.id];
        var c = { id: node.id, label: node.label, w: node.w, leaf: node.leaf,
          symIdx: node.symIdx, left: null, right: null };
        map[node.id] = c;
        c.left = clone(node.left);
        c.right = clone(node.right);
        return c;
      }
      return { roots: nodes.map(clone), seq: nodeSeq };
    }

    function pushHistory() { history.push(snapshot()); }

    function undo() {
      if (!history.length) return;
      var snap = history.pop();
      nodes = snap.roots;
      nodeSeq = snap.seq;
      selected = [];
      finished = false;
      api.sfx('click');
      render();
    }

    /* ---- merge mechanic ---- */
    function nodeById(id) {
      for (var i = 0; i < nodes.length; i++) if (nodes[i].id === id) return nodes[i];
      return null;
    }

    function toggleSelect(id) {
      var pos = selected.indexOf(id);
      if (pos >= 0) { selected.splice(pos, 1); api.sfx('click'); render(); return; }
      selected.push(id);
      api.sfx('click');
      if (selected.length === 2) { doMerge(); return; } // auto-merge on second pick
      render();
    }

    function doMerge() {
      if (selected.length !== 2) return;
      var a = nodeById(selected[0]);
      var b = nodeById(selected[1]);
      if (!a || !b) { selected = []; render(); return; }
      pushHistory();
      var parent = {
        id: ++nodeSeq, leaf: false, symIdx: -1,
        label: a.label + b.label, w: a.w + b.w, left: a, right: b,
      };
      nodes = nodes.filter(function (n) { return n.id !== a.id && n.id !== b.id; });
      nodes.push(parent);
      selected = [];
      api.sfx('good');
      if (nodes.length === 1) finishRound();
      render();
    }

    /* ---- read codeword lengths off the finished tree ---- */
    // Returns array indexed by symIdx (original symbol order).
    function leafLengths() {
      var lengths = new Array(round.syms.length).fill(0);
      function walk(node, d) {
        if (!node) return;
        if (node.leaf) { lengths[node.symIdx] = d; return; }
        walk(node.left, d + 1);
        walk(node.right, d + 1);
      }
      // After finish there is exactly one root.
      walk(nodes[0], 0);
      return lengths;
    }

    // Build code map symIdx -> bitstring by walking branches (left=0,right=1).
    function buildCodeMap() {
      var codes = {};
      function walk(node, prefix) {
        if (!node) return;
        if (node.leaf) { codes[node.symIdx] = prefix || '0'; return; }
        walk(node.left, prefix + '0');
        walk(node.right, prefix + '1');
      }
      walk(nodes[0], '');
      return codes;
    }

    function finishRound() {
      finished = true;
      var lengths = leafLengths();
      var Lbar = avgLength(round.probs, lengths);
      var Lstar = avgLength(round.probs, huffmanLengths(round.probs));
      var H = entropy(round.probs);
      var excess = Lstar > 0 ? (Lbar - Lstar) / Lstar : 0;
      if (excess < 1e-9) excess = 0; // snap tiny float noise to optimal
      results[roundIdx] = { Lbar: Lbar, Lstar: Lstar, H: H, excess: excess,
        dyadic: round.dyadic };
      api.sfx(excess === 0 ? 'win' : 'good');
    }

    /* ---- rendering ---- */
    function render() {
      wrap.replaceChildren();
      setStatus();

      // Banner / round intro.
      var banner = mk('div', 'hf-banner',
        '<b>Round ' + (roundIdx + 1) + '/3 — ' + round.title + '.</b> ' +
        round.note + ' Click two cards to weld them; weights add.');
      wrap.appendChild(banner);

      // Working row of free nodes.
      wrap.appendChild(mk('div', 'hf-section-label', 'Working row · free nodes'));
      var free = mk('div', 'hf-free');
      // Sort display by weight ascending so the two cheapest sit together.
      var sorted = nodes.slice().sort(function (x, y) { return x.w - y.w; });
      sorted.forEach(function (node) {
        var card = mk('div', 'hf-card' + (node.leaf ? '' : ' hf-internal') +
          (selected.indexOf(node.id) >= 0 ? ' hf-sel' : ''));
        card.appendChild(mk('div', 'hf-lab', node.leaf ? node.label : '{' + node.label + '}'));
        card.appendChild(mk('div', 'hf-w', (node.w * 100).toFixed(node.w < 0.01 ? 2 : 1) + '%'));
        card.addEventListener('click', function () { toggleSelect(node.id); });
        free.appendChild(card);
      });
      wrap.appendChild(free);

      // Actions.
      var actions = mk('div', 'hf-actions');
      var mergeBtn = mk('button', 'btn', 'Merge selected');
      mergeBtn.disabled = selected.length !== 2;
      mergeBtn.addEventListener('click', doMerge);
      actions.appendChild(mergeBtn);
      var undoBtn = mk('button', 'btn btn-ghost', '↶ Undo');
      undoBtn.disabled = history.length === 0;
      undoBtn.addEventListener('click', undo);
      actions.appendChild(undoBtn);
      wrap.appendChild(actions);

      if (!finished) {
        wrap.appendChild(mk('div', 'hf-hint',
          'Tip: the optimal move is always to merge the two <i>least</i>-probable nodes.'));
      }

      // Forest / tree panel.
      wrap.appendChild(mk('div', 'hf-section-label', 'Code tree'));
      var panel = mk('div', 'hf-treepanel');
      var forest = mk('div', 'hf-forest');
      nodes.slice().sort(function (x, y) { return y.w - x.w; }).forEach(function (rootNode) {
        forest.appendChild(renderTree(rootNode, finished));
      });
      panel.appendChild(forest);
      wrap.appendChild(panel);

      if (finished) renderVerdict();
    }

    // Render one (sub)tree as nested DOM. When labelled=true, draw 0/1 bit labels.
    function renderTree(node, labelled, bit) {
      var holder = mk('div', 'hf-branch');
      if (bit != null) holder.appendChild(mk('span', 'hf-bit', bit));
      if (node.leaf) {
        holder.appendChild(mk('div', 'hf-leaf',
          '<b>' + node.label + '</b><br>' + (node.w * 100).toFixed(node.w < 0.01 ? 2 : 1) + '%'));
      } else {
        holder.appendChild(mk('div', 'hf-inode', (node.w * 100).toFixed(node.w < 0.01 ? 2 : 1) + '%'));
        var kids = mk('div', 'hf-kids');
        kids.appendChild(renderTree(node.left, labelled, labelled ? '0' : null));
        kids.appendChild(renderTree(node.right, labelled, labelled ? '1' : null));
        holder.appendChild(kids);
      }
      return holder;
    }

    /* ---- verdict panel after a round completes ---- */
    function renderVerdict() {
      var r = results[roundIdx];
      var codes = buildCodeMap();
      var lengths = leafLengths();

      var box = mk('div', 'g-card');
      box.appendChild(mk('div', 'hf-section-label', 'Verdict'));

      // Code table.
      var tbl = mk('table', 'hf-table');
      var thead = '<tr><th>sym</th><th>p</th><th>code</th><th>len</th></tr>';
      var rows = '';
      for (var i = 0; i < round.syms.length; i++) {
        rows += '<tr><td><b>' + round.syms[i] + '</b></td><td>' +
          (round.probs[i] * 100).toFixed(round.probs[i] < 0.01 ? 2 : 1) + '%</td>' +
          '<td><code>' + codes[i] + '</code></td><td>' + lengths[i] + '</td></tr>';
      }
      tbl.innerHTML = '<thead>' + thead + '</thead><tbody>' + rows + '</tbody>';
      box.appendChild(tbl);

      // Metrics.
      var metrics = mk('div', 'hf-metrics');
      metrics.style.marginTop = '0.7rem';
      metrics.appendChild(mk('span', 'g-pill', 'your L̄ = ' + r.Lbar.toFixed(3)));
      metrics.appendChild(mk('span', 'g-pill', 'optimum L* = ' + r.Lstar.toFixed(3)));
      metrics.appendChild(mk('span', 'g-pill', 'entropy H = ' + r.H.toFixed(3)));
      box.appendChild(metrics);

      var verdictLine;
      if (r.excess === 0) {
        if (r.dyadic) {
          verdictLine = '<span class="hf-floor">Optimal — and the code meets the ' +
            'entropy floor (L* = H). Only possible because every probability is a power of 2.</span>';
        } else {
          verdictLine = '<span class="hf-floor">Optimal forge. L̄ = L* — ' +
            'no symbol code can do better.</span>';
        }
      } else {
        verdictLine = 'Off the optimum by ' + (r.excess * 100).toFixed(1) +
          '% (' + (r.Lbar - r.Lstar).toFixed(3) + ' bits/symbol wasted). ' +
          'The greedy merge of the two least-probable nodes would have done better.';
      }
      box.appendChild(mk('div', 'hf-hint', verdictLine));

      // Sample-word encoding: your code vs a fixed-length code.
      var indices = round.sample.split('').map(function (ch) {
        return round.syms.indexOf(ch);
      }).filter(function (k) { return k >= 0; });
      var fixedLen = Math.ceil(Math.log2(round.syms.length));
      var fixedMap = {};
      for (var k = 0; k < round.syms.length; k++) {
        fixedMap[k] = k.toString(2);
        while (fixedMap[k].length < fixedLen) fixedMap[k] = '0' + fixedMap[k];
      }
      var yourBits = encode(indices, codes);
      var fixedBits = encode(indices, fixedMap);
      var sampleBox = mk('div', null,
        '<div class="hf-section-label" style="margin-top:0.8rem">Sample word “' +
        round.sample + '”</div>' +
        '<div class="hf-hint">fixed ' + fixedLen + '-bit code (' + fixedBits.length +
        ' bits): <span class="hf-bits">' + fixedBits + '</span></div>' +
        '<div class="hf-hint">your prefix code (' + yourBits.length +
        ' bits): <span class="hf-bits">' + yourBits + '</span> → saved ' +
        (fixedBits.length - yourBits.length) + ' bits</div>');
      box.appendChild(sampleBox);

      // Advance / finish button.
      var nextBtn = mk('button', 'btn btn-primary hf-roundbtn',
        roundIdx < ROUNDS.length - 1 ? 'Next round →' : 'Finish & see verdict');
      nextBtn.addEventListener('click', function () {
        api.sfx('click');
        if (roundIdx < ROUNDS.length - 1) {
          roundIdx++;
          startRound();
        } else {
          completeGame();
        }
      });
      box.appendChild(nextBtn);

      wrap.appendChild(box);
    }

    /* ---- start a fresh round ---- */
    function startRound() {
      round = ROUNDS[roundIdx];
      nodes = [];
      nodeSeq = 0;
      selected = [];
      history = [];
      finished = false;
      for (var i = 0; i < round.syms.length; i++) {
        nodes.push({ id: ++nodeSeq, leaf: true, symIdx: i,
          label: round.syms[i], w: round.probs[i], left: null, right: null });
      }
      render();
    }

    /* ---- end of game: tally stars/bits and report once ---- */
    function completeGame() {
      if (done) return;
      done = true;

      var totalExcess = results.reduce(function (a, r) { return a + r.excess; }, 0);
      var allOptimal = results.every(function (r) { return r.excess === 0; });

      var stars;
      if (allOptimal) stars = 3;
      else if (totalExcess <= 0.05) stars = 2;
      else stars = 1;

      // bits = clamp(round(50 - 300·totalExcess), 10, 50); 50 only when all-optimal.
      var bits = Math.round(50 - 300 * totalExcess);
      if (bits > 50) bits = 50;
      if (bits < 10) bits = 10;
      if (!allOptimal && bits >= 50) bits = 49;

      var headline = allOptimal ? 'Encoder reforged — optimal on every round'
        : (stars === 2 ? 'Encoder reforged — near-optimal' : 'Encoder back online');

      // Per-round breakdown table.
      var rowsHtml = '';
      for (var i = 0; i < results.length; i++) {
        var r = results[i];
        var tag = r.excess === 0
          ? (r.dyadic ? '<span style="color:var(--green)">L*=H (dyadic floor)</span>'
                      : '<span style="color:var(--green)">optimal</span>')
          : '+' + (r.excess * 100).toFixed(1) + '%';
        rowsHtml += '<tr><td>Round ' + (i + 1) + '</td><td>' + r.Lbar.toFixed(3) +
          '</td><td>' + r.Lstar.toFixed(3) + '</td><td>' + r.H.toFixed(3) +
          '</td><td>' + tag + '</td></tr>';
      }

      var detailHTML =
        '<p>Across three forges your average excess over the optimum was <b>' +
        (totalExcess / 3 * 100).toFixed(1) + '%</b> per round.</p>' +
        '<table><thead><tr><th>round</th><th>your L̄</th><th>optimum L*</th>' +
        '<th>entropy H</th><th>gap</th></tr></thead><tbody>' + rowsHtml +
        '</tbody></table>' +
        '<p>Lesson: always merge the two <b>least-probable</b> nodes — that greedy ' +
        'rule is Huffman’s, and it is optimal among symbol codes. The expected length ' +
        'is squeezed by <b>H ≤ L* &lt; H + 1</b>, with L* = H exactly only on a dyadic ' +
        'source (round 3), where every probability is a power of two.</p>';

      api.complete({ stars: stars, bits: bits, headline: headline, detailHTML: detailHTML });
    }

    // Kick off round 1.
    startRound();

    return {
      destroy: function () {
        for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
        timers = [];
        // No document-level listeners were added; card listeners die with the DOM.
      },
    };
  },
});

})();
