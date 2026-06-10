/* THE QUIET ARCHIPELAGO — tree-planner ('tree-planner')
   Huffman Wood. Huff the beaver plans trails: join the two QUIETEST trailheads
   into a junction, over and over, until one path remains. That greedy merge IS
   Huffman's algorithm — and the total village-walks per day it produces is
   provably the smallest possible. Live cost ticker shows the neat fact that the
   Huffman cost equals the sum of every junction's combined daily count.

   Config: { villages:[{name, daily}], par:'optimal'|number, tolerance?:0 }
   No globals; pure logic first, then UI; one <style> (prefix `tp-`). */
(function () {
'use strict';

/* ----------------------------- pure logic ----------------------------- */

/* Optimal Huffman cost = sum of all merge sums (greedy: merge two minima).
   This equals Σ weightᵢ·depthᵢ for an optimal tree — tested in scratch. */
function huffmanCost(weights) {
  if (weights.length <= 1) return 0;
  var heap = weights.slice();
  var total = 0;
  while (heap.length > 1) {
    heap.sort(function (a, b) { return a - b; });
    var s = heap.shift() + heap.shift();
    total += s;
    heap.push(s);
  }
  return total;
}

/* Cost of an ARBITRARY built tree: Σ leaf.daily · depth(leaf). */
function treeCost(root) {
  var sum = 0;
  (function walk(n, d) {
    if (n.kids) { walk(n.kids[0], d + 1); walk(n.kids[1], d + 1); }
    else sum += n.daily * d;
  })(root, 0);
  return sum;
}

/* Total weight of leaves under a node (== node.daily, kept in sync on build). */
function leafCount(root) {
  var n = 0;
  (function walk(x) { if (x.kids) { walk(x.kids[0]); walk(x.kids[1]); } else n++; })(root);
  return n;
}

/* --------------------------------- UI --------------------------------- */

var STYLE_ID = 'tp-style';
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  var css =
  '.tp-wrap{display:flex;flex-direction:column;gap:.8rem}' +
  '.tp-intro{color:var(--muted);font-size:.9rem;line-height:1.5}' +
  '.tp-intro b{color:var(--text)}' +
  '.tp-meters{display:flex;gap:.6rem;flex-wrap:wrap}' +
  '.tp-meter{flex:1 1 150px;background:var(--surface);border:1px solid var(--surface2);' +
    'border-radius:10px;padding:.5rem .7rem}' +
  '.tp-meter .tp-mlabel{font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}' +
  '.tp-meter .tp-mval{font-size:1.25rem;font-weight:600;color:var(--text);margin-top:.1rem}' +
  '.tp-meter .tp-mval small{font-size:.7rem;color:var(--muted);font-weight:400}' +
  '.tp-forest{background:var(--surface);border:1px solid var(--surface2);border-radius:12px;' +
    'padding:.8rem;min-height:120px;overflow-x:auto}' +
  '.tp-roots{display:flex;gap:.7rem;align-items:flex-end;flex-wrap:wrap}' +
  '.tp-node{display:flex;flex-direction:column;align-items:center;gap:0}' +
  '.tp-junc-kids{display:flex;gap:.5rem;align-items:flex-start;padding-top:.5rem;position:relative}' +
  '.tp-junc-kids::before{content:"";position:absolute;top:0;left:25%;right:25%;height:2px;' +
    'background:var(--border)}' +
  '.tp-edge{width:2px;height:.5rem;background:var(--border)}' +
  '.tp-card{min-width:64px;min-height:46px;border-radius:10px;border:2px solid var(--surface2);' +
    'background:var(--bg);padding:.35rem .5rem;text-align:center;cursor:pointer;' +
    'display:flex;flex-direction:column;justify-content:center;transition:all .12s}' +
  '.tp-card:hover{border-color:var(--blue)}' +
  '.tp-card.tp-junc{background:var(--surface2);border-color:var(--border);cursor:default}' +
  '.tp-card.tp-sel{border-color:var(--green);box-shadow:0 0 0 2px rgba(52,211,153,.35)}' +
  '.tp-card.tp-quiet{border-color:var(--cyan)}' +
  '.tp-name{font-size:.8rem;color:var(--text);line-height:1.1}' +
  '.tp-daily{font-size:.72rem;color:var(--muted)}' +
  '.tp-junc .tp-name{color:var(--muted);font-size:.7rem}' +
  '.tp-junc .tp-daily{color:var(--cyan);font-weight:600;font-size:.8rem}' +
  '.tp-controls{display:flex;gap:.5rem;flex-wrap:wrap}' +
  '.tp-controls .btn{min-height:42px}' +
  '.tp-hint{font-size:.8rem;color:var(--dim)}' +
  '.tp-end{background:var(--surface);border:1px solid var(--surface2);border-radius:12px;padding:1rem;' +
    'display:flex;flex-direction:column;gap:.6rem}' +
  '.tp-end.tp-win{border-color:var(--green)}' +
  '.tp-end.tp-lose{border-color:var(--yellow)}' +
  '.tp-end h3{font-size:1rem;color:var(--text)}' +
  '.tp-end p{font-size:.88rem;color:var(--muted);line-height:1.5}' +
  '.tp-end .tp-win-line{color:var(--green)}' +
  '.tp-quiet-tag{font-size:.6rem;color:var(--cyan);letter-spacing:.05em;text-transform:uppercase}';
  var el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = css;
  document.head.appendChild(el);
}

function create(root, config, api) {
  injectStyle();

  var villages = (config.villages || []).map(function (v, i) {
    return { id: i, name: String(v.name), daily: v.daily | 0 };
  });
  var tolerance = config.tolerance != null ? (config.tolerance | 0) : 0;
  var optimal = huffmanCost(villages.map(function (v) { return v.daily; }));
  var parTarget = (config.par === 'optimal' || config.par == null)
    ? optimal : Math.max(optimal, config.par | 0);

  // forest = array of root nodes. leaf {id,name,daily}; junction {kids:[a,b],daily,name}
  var forest, committed, history, selected, juncCount;

  function reset() {
    forest = villages.map(function (v) { return { id: v.id, name: v.name, daily: v.daily }; });
    committed = 0;      // running Huffman cost = Σ junction sums so far
    history = [];        // snapshots of {forest, committed, juncCount} for undo
    selected = [];       // indices into forest currently selected (max 2)
    juncCount = 0;
    render();
  }

  function snapshot() {
    // structural clone is unnecessary; we keep node refs but record array + scalars.
    history.push({ forest: forest.slice(), committed: committed, juncCount: juncCount });
  }

  function quietestTwoIdx() {
    if (forest.length < 2) return [];
    var order = forest.map(function (n, i) { return i; })
      .sort(function (a, b) { return forest[a].daily - forest[b].daily; });
    return [order[0], order[1]];
  }

  function join() {
    if (selected.length !== 2) return;
    snapshot();
    var i = selected[0], j = selected[1];
    var a = forest[i], b = forest[j];
    var junc = {
      kids: [a, b],
      daily: a.daily + b.daily,
      name: 'junction'
    };
    committed += junc.daily;
    juncCount++;
    // remove the two, add the junction
    var next = [];
    for (var k = 0; k < forest.length; k++) {
      if (k !== i && k !== j) next.push(forest[k]);
    }
    next.push(junc);
    forest = next;
    selected = [];
    api.sfx('open');
    render();
  }

  function undo() {
    if (!history.length) return;
    var s = history.pop();
    forest = s.forest;
    committed = s.committed;
    juncCount = s.juncCount;
    selected = [];
    api.sfx('select');
    render();
  }

  function toggleSelect(idx) {
    var at = selected.indexOf(idx);
    if (at >= 0) { selected.splice(at, 1); }
    else if (selected.length < 2) { selected.push(idx); api.sfx('select'); }
    else { selected = [idx]; api.sfx('select'); }
    render();
  }

  /* ---- DOM rendering ---- */

  function nodeEl(node, rootIdx, quietSet) {
    var wrap = document.createElement('div');
    wrap.className = 'tp-node';

    if (node.kids) {
      var card = document.createElement('div');
      card.className = 'tp-card tp-junc';
      card.innerHTML = '<span class="tp-name">junction</span>' +
        '<span class="tp-daily">' + node.daily + '/day</span>';
      wrap.appendChild(card);
      var edge = document.createElement('div');
      edge.className = 'tp-edge';
      wrap.appendChild(edge);
      var kids = document.createElement('div');
      kids.className = 'tp-junc-kids';
      kids.appendChild(nodeEl(node.kids[0], rootIdx, quietSet));
      kids.appendChild(nodeEl(node.kids[1], rootIdx, quietSet));
      wrap.appendChild(kids);
    } else {
      var leaf = document.createElement('button');
      leaf.type = 'button';
      leaf.className = 'tp-card';
      leaf.innerHTML = '<span class="tp-name">' + G.util.esc(node.name) + '</span>' +
        '<span class="tp-daily">' + node.daily + ' walkers/day</span>';
      // selection + quiet hints only apply at the ROOT level (only roots are joinable)
      if (rootIdx != null) {
        if (selected.indexOf(rootIdx) >= 0) leaf.classList.add('tp-sel');
        if (quietSet.indexOf(rootIdx) >= 0) leaf.classList.add('tp-quiet');
        leaf.addEventListener('click', function () { toggleSelect(rootIdx); });
      }
      wrap.appendChild(leaf);
    }
    return wrap;
  }

  // For a root that is itself a junction we make its whole subtree clickable via
  // a wrapper button at the top; simpler: render root, and attach a select
  // handler to the root card. We rebuild dedicated root rendering below.
  function rootEl(node, idx, quietSet) {
    var wrap = document.createElement('div');
    wrap.className = 'tp-node';
    var selectable = forest.length >= 2;

    var card = document.createElement(node.kids ? 'div' : 'button');
    card.className = 'tp-card' + (node.kids ? ' tp-junc' : '');
    if (node.kids) {
      card.innerHTML = '<span class="tp-quiet-tag">trail group</span>' +
        '<span class="tp-name">' + node.daily + '/day</span>';
    } else {
      card.innerHTML = '<span class="tp-name">' + G.util.esc(node.name) + '</span>' +
        '<span class="tp-daily">' + node.daily + ' walkers/day</span>';
    }
    if (selectable) {
      card.style.cursor = 'pointer';
      if (selected.indexOf(idx) >= 0) card.classList.add('tp-sel');
      if (quietSet.indexOf(idx) >= 0) card.classList.add('tp-quiet');
      card.addEventListener('click', function () { toggleSelect(idx); });
      if (node.kids) card.tabIndex = 0;
    }
    wrap.appendChild(card);

    if (node.kids) {
      var edge = document.createElement('div');
      edge.className = 'tp-edge';
      wrap.appendChild(edge);
      var kids = document.createElement('div');
      kids.className = 'tp-junc-kids';
      kids.appendChild(nodeEl(node.kids[0], null, quietSet));
      kids.appendChild(nodeEl(node.kids[1], null, quietSet));
      wrap.appendChild(kids);
    }
    return wrap;
  }

  function render() {
    root.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'tp-wrap';

    var intro = document.createElement('div');
    intro.className = 'tp-intro';
    intro.innerHTML = 'Huff taps the clipboard. <b>Join the two quietest trailheads</b> into a ' +
      'junction, again and again, until one path remains. Fewer total walks per day = a happier wood.';
    wrap.appendChild(intro);

    // meters
    var meters = document.createElement('div');
    meters.className = 'tp-meters';
    var roots = forest.length;
    meters.innerHTML =
      '<div class="tp-meter"><div class="tp-mlabel">Committed walk-cost</div>' +
        '<div class="tp-mval">' + committed + ' <small>walks/day</small></div></div>' +
      '<div class="tp-meter"><div class="tp-mlabel">Junctions built</div>' +
        '<div class="tp-mval">' + juncCount + '</div></div>' +
      '<div class="tp-meter"><div class="tp-mlabel">Trailheads left</div>' +
        '<div class="tp-mval">' + roots + '</div></div>';
    wrap.appendChild(meters);

    var note = document.createElement('div');
    note.className = 'tp-hint';
    note.innerHTML = 'Neat fact: the final cost is exactly the <b>sum of every junction&rsquo;s ' +
      'daily count</b> — that running total above is your score-in-progress.';
    wrap.appendChild(note);

    // forest
    var quietSet = forest.length >= 2 ? quietestTwoIdx() : [];
    var forestBox = document.createElement('div');
    forestBox.className = 'tp-forest';
    var rootsRow = document.createElement('div');
    rootsRow.className = 'tp-roots';
    forest.forEach(function (n, i) { rootsRow.appendChild(rootEl(n, i, quietSet)); });
    forestBox.appendChild(rootsRow);
    wrap.appendChild(forestBox);

    if (forest.length > 1) {
      var controls = document.createElement('div');
      controls.className = 'tp-controls';

      var joinBtn = document.createElement('button');
      joinBtn.className = 'btn btn-primary';
      joinBtn.textContent = 'Join trails';
      joinBtn.disabled = selected.length !== 2;
      joinBtn.addEventListener('click', join);
      controls.appendChild(joinBtn);

      var undoBtn = document.createElement('button');
      undoBtn.className = 'btn';
      undoBtn.textContent = 'Undo';
      undoBtn.disabled = history.length === 0;
      undoBtn.addEventListener('click', undo);
      controls.appendChild(undoBtn);

      var quietBtn = document.createElement('button');
      quietBtn.className = 'btn btn-ghost';
      quietBtn.textContent = 'Highlight quietest two';
      quietBtn.addEventListener('click', function () {
        selected = quietestTwoIdx();
        api.sfx('select');
        render();
      });
      controls.appendChild(quietBtn);

      wrap.appendChild(controls);
      var help = document.createElement('div');
      help.className = 'tp-hint';
      help.textContent = selected.length === 2
        ? 'Two trails picked — press Join trails.'
        : 'Tap two trailheads (the cyan ones are the quietest pair).';
      wrap.appendChild(help);
    } else {
      wrap.appendChild(endCard());
    }

    root.appendChild(wrap);
    updateStatus();
  }

  function endCard() {
    var finalCost = treeCost(forest[0]);
    var n = leafCount(forest[0]);
    var box = document.createElement('div');
    var win = finalCost <= optimal + tolerance;
    box.className = 'tp-end ' + (win ? 'tp-win' : 'tp-lose');

    if (win) {
      box.innerHTML =
        '<h3>The wood goes quiet — the path is clear.</h3>' +
        '<p class="tp-win-line">Total cost <b>' + finalCost + '</b> walks/day' +
          (parTarget > optimal ? ' (par ' + parTarget + ')' : '') +
          ' — that ties the provable optimum <b>' + optimal + '</b>.</p>' +
        '<p>Joining the two <b>quietest</b> trails first is provably optimal — this is exactly ' +
          'how optimal codes are built (Huffman, 1952). Your committed total equals the sum of ' +
          'all junction sums, and that sum equals Σ&nbsp;daily&times;depth: the cost ' +
          '<b>C&nbsp;=&nbsp;' + finalCost + '</b> sits on the entropy floor H&middot;N for these ' +
          'walker counts.</p>';
      var btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = 'Open the path';
      btn.style.alignSelf = 'flex-start';
      btn.addEventListener('click', function () { api.complete(); });
      box.appendChild(btn);
    } else {
      var over = finalCost - optimal;
      box.innerHTML =
        '<h3>The walkers grumble.</h3>' +
        '<p>This plan costs <b>' + finalCost + '</b> walks/day — that&rsquo;s <b>' + over +
          '</b> walk' + (over === 1 ? '' : 's') + '/day over the best plan (<b>' + optimal +
          '</b>). Huff scratches out a note: <i>always merge the two quietest first.</i></p>';
      var rep = document.createElement('button');
      rep.className = 'btn';
      rep.textContent = 'Replant';
      rep.style.alignSelf = 'flex-start';
      rep.addEventListener('click', reset);
      box.appendChild(rep);
    }
    return box;
  }

  function updateStatus() {
    if (forest.length > 1) {
      api.status('committed ' + committed + ' · optimal ' + optimal + ' walks/day');
    } else {
      var fc = treeCost(forest[0]);
      api.status('C = ' + fc + ' vs optimal ' + optimal);
    }
  }

  reset();

  return {
    destroy: function () {
      root.innerHTML = '';
    }
  };
}

G.puzzles.register('tree-planner', {
  title: 'Huff&rsquo;s Trail Network',
  create: create
});

})();
