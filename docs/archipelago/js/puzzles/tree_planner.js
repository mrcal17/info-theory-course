/* THE QUIET ARCHIPELAGO — tree-planner ('tree-planner')
   Huffman Wood. Huff the beaver plans trails: join trailheads two at a time
   into junctions until one path remains; cost = Σ daily·depth = the sum of
   every junction's combined daily count. Greedy two-QUIETEST-first is Huffman's
   algorithm and provably optimal.

   PEDAGOGY §6.5 loop (first encounter, i.e. !G.pz.taught('tree-planner')):
     HOOK    — "busiest first, or quietest first?" predict-then-find-out.
     FORCED  — round 1 forces busiest-first: for the first 2 merges only the two
               current-largest piles are selectable; the cost ticker runs hot;
               Huff drops "every walker pays for every junction above it"; the
               old plan then auto-finishes and Huff scraps it.
     FREE    — same villages; the forced run's total is the cost-to-beat
               (intermediate gate); the FINAL gate is unchanged: par from config
               ('optimal' or numeric), within `tolerance` (default 0).
     WIN     — per-village depth list + identity cost = Σ daily·depth
               ("depth is code length; busy villages sit shallow"), then the
               debrief: this greedy IS Huffman; ties to Sift's question-trees.
     Hints   — G.pz.hintLadder: two-smallest-always / a merged pile competes by
               its SUM / the full merge order for this config.
   Repeat encounters (taught): skip hook + forced round; straight to free play
   with the par gate; coach trimmed to failure hints + debrief.

   Config (FROZEN): { villages:[{name, daily}], par:'optimal'|number, tolerance?:0 }
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

/* Cost of the naive busiest-first plan (greedy: merge two maxima). The forced
   round plays exactly this, so its on-screen total always equals this number. */
function greedyMaxCost(weights) {
  if (weights.length <= 1) return 0;
  var heap = weights.slice();
  var total = 0;
  while (heap.length > 1) {
    heap.sort(function (a, b) { return b - a; });
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

/* Leaves of a built tree with their depths (for the completion table). */
function leafDepths(root) {
  var out = [];
  (function walk(n, d) {
    if (n.kids) { walk(n.kids[0], d + 1); walk(n.kids[1], d + 1); }
    else out.push({ name: n.name, daily: n.daily, depth: d });
  })(root, 0);
  return out;
}

/* Final gate target from config — unchanged semantics: 'optimal' (or absent)
   means the internal optimum; a numeric par can only loosen, never tighten. */
function resolvePar(config, optimal) {
  return (config.par === 'optimal' || config.par == null)
    ? optimal : Math.max(optimal, config.par | 0);
}

function gatePass(cost, parTarget, tolerance) {
  return cost <= parTarget + tolerance;
}

/* The full optimal merge order spelled out — hint 3 walks the player through. */
function mergeWalk(villages) {
  var piles = villages.map(function (v) {
    return { name: v.name, daily: v.daily, junc: false };
  });
  var steps = [];
  function label(p) {
    return p.junc ? 'the ' + p.daily + '-pile' : p.name + ' (' + p.daily + ')';
  }
  while (piles.length > 1) {
    piles.sort(function (a, b) { return a.daily - b.daily; });
    var a = piles.shift(), b = piles.shift();
    var s = a.daily + b.daily;
    steps.push(label(a) + ' + ' + label(b) + ' → ' + s);
    piles.push({ daily: s, junc: true });
  }
  return steps;
}

/* --------------------------------- UI --------------------------------- */

var STYLE_ID = 'tp-style';
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  var css =
  '.tp-wrap{display:flex;flex-direction:column;gap:.8rem}' +
  '.tp-hint{font-size:.8rem;color:var(--dim);line-height:1.45}' +
  '.tp-hint b{color:var(--text)}' +
  '.tp-meters{display:flex;gap:.6rem;flex-wrap:wrap}' +
  '.tp-meter{flex:1 1 130px;background:var(--surface);border:1px solid var(--surface2);' +
    'border-radius:10px;padding:.5rem .7rem}' +
  '.tp-meter .tp-mlabel{font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}' +
  '.tp-meter .tp-mval{font-size:1.25rem;font-weight:600;color:var(--text);margin-top:.1rem;' +
    'font-variant-numeric:tabular-nums}' +
  '.tp-meter .tp-mval small{font-size:.7rem;color:var(--muted);font-weight:400}' +
  '.tp-meter.tp-hot{border-color:var(--orange)}' +
  '.tp-meter.tp-hot .tp-mval{color:var(--orange);animation:tp-pulse .9s ease-in-out infinite}' +
  '@keyframes tp-pulse{0%,100%{opacity:1}50%{opacity:.55}}' +
  '.tp-forest{background:var(--surface);border:1px solid var(--surface2);border-radius:12px;' +
    'padding:.8rem;min-height:120px;overflow-x:auto}' +
  '.tp-roots{display:flex;gap:.7rem;align-items:flex-end;flex-wrap:wrap}' +
  '.tp-node{display:flex;flex-direction:column;align-items:center;gap:0}' +
  '.tp-junc-kids{display:flex;gap:.5rem;align-items:flex-start;padding-top:.5rem;position:relative}' +
  '.tp-junc-kids::before{content:"";position:absolute;top:0;left:25%;right:25%;height:2px;' +
    'background:var(--border)}' +
  '.tp-edge{width:2px;height:.5rem;background:var(--border)}' +
  '.tp-card{min-width:64px;min-height:46px;border-radius:10px;border:2px solid var(--surface2);' +
    'background:var(--bg);padding:.35rem .5rem;text-align:center;font:inherit;color:inherit;' +
    'display:flex;flex-direction:column;justify-content:center;align-items:center;' +
    'transition:border-color .12s,box-shadow .12s,opacity .12s}' +
  'button.tp-card{cursor:pointer}' +
  'button.tp-card:disabled{cursor:default}' +
  '.tp-rootcard:not(:disabled):hover{border-color:var(--blue)}' +
  '.tp-card.tp-junc{background:var(--surface2);border-color:var(--border)}' +
  '.tp-card.tp-sub{cursor:default}' +
  '.tp-card.tp-sel{border-color:var(--green);box-shadow:0 0 0 2px rgba(52,211,153,.35)}' +
  '.tp-card.tp-big:not(.tp-sel){border-color:var(--orange)}' +
  '.tp-card.tp-dis{opacity:.35;border-style:dashed}' +
  '.tp-name{font-size:.8rem;color:var(--text);line-height:1.15}' +
  '.tp-daily{font-size:.72rem;color:var(--muted)}' +
  '.tp-tag{font-size:.6rem;color:var(--cyan);letter-spacing:.05em;text-transform:uppercase}' +
  '.tp-junc .tp-name{color:var(--muted);font-size:.78rem}' +
  '.tp-junc .tp-daily{color:var(--cyan);font-weight:600;font-size:.8rem}' +
  '.tp-controls{display:flex;gap:.5rem;flex-wrap:wrap}' +
  '.tp-controls .btn{min-height:44px}' +
  '.tp-end{background:var(--surface);border:1px solid var(--surface2);border-radius:12px;' +
    'padding:1rem;display:flex;flex-direction:column;gap:.6rem}' +
  '.tp-end.tp-win{border-color:var(--green)}' +
  '.tp-end.tp-lose{border-color:var(--yellow)}' +
  '.tp-end h3{font-size:1rem;color:var(--text);margin:0}' +
  '.tp-end p{font-size:.88rem;color:var(--muted);line-height:1.5;margin:0}' +
  '.tp-end p b{color:var(--text)}' +
  '.tp-end .tp-win-line{color:var(--green)}' +
  '.tp-end .tp-win-line b{color:var(--green)}' +
  '.tp-end .btn{min-height:44px}' +
  '.tp-table{border-collapse:collapse;font-size:.82rem;width:100%;max-width:480px}' +
  '.tp-table th{font-size:.66rem;letter-spacing:.07em;text-transform:uppercase;color:var(--dim);' +
    'text-align:left;padding:.2rem .55rem;border-bottom:1px solid var(--surface2)}' +
  '.tp-table td{padding:.25rem .55rem;color:var(--text);font-variant-numeric:tabular-nums;' +
    'border-bottom:1px solid var(--surface2)}' +
  '.tp-table td:first-child{color:var(--muted)}' +
  '.tp-table .tp-total td{font-weight:700;color:var(--gold);border-bottom:0}';
  var el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = css;
  document.head.appendChild(el);
}

function create(root, config, api) {
  injectStyle();
  var esc = G.util.esc;

  var villages = (config.villages || []).map(function (v, i) {
    return { id: i, name: String(v.name), daily: v.daily | 0 };
  });
  var tolerance = config.tolerance != null ? (config.tolerance | 0) : 0;
  var weights = villages.map(function (v) { return v.daily; });
  var optimal = huffmanCost(weights);
  var forcedTotal = greedyMaxCost(weights);   // the old plan's total = cost-to-beat
  var parTarget = resolvePar(config, optimal);
  var taughtMode = G.pz.taught('tree-planner');
  var FORCED = Math.min(2, Math.max(0, villages.length - 1)); // manual forced merges

  var ladder = G.pz.hintLadder([
    'Two smallest piles. <b>Always.</b> Even when one of them is a junction you just built.',
    'A merged pile competes by its <b>sum</b>. After every join, re-rank the piles — ' +
      'sometimes the fresh junction is one of the two quietest, sometimes it isn&rsquo;t.',
    'Huff dictates the whole plan: <b>' + esc(mergeWalk(villages).join('; then ')) +
      '.</b> Follow it exactly — quietest pair, every single time.',
  ]);
  var curHint = null;

  // forest = array of root nodes. leaf {id,name,daily}; junction {kids:[a,b],daily,name}
  var phase, forest, committed, history, selected, juncCount, lastCost = 0;
  var runTimer = null;

  function resetForest() {
    forest = villages.map(function (v) { return { id: v.id, name: v.name, daily: v.daily }; });
    committed = 0;      // running cost ticker = Σ junction sums so far
    history = [];       // snapshots for undo (free play only)
    selected = [];      // root indices currently selected (max 2)
    juncCount = 0;
  }

  function snapshot() {
    history.push({ forest: forest.slice(), committed: committed, juncCount: juncCount });
  }

  function biggestTwoIdx() {
    if (forest.length < 2) return [];
    var order = forest.map(function (n, i) { return i; })
      .sort(function (a, b) { return forest[b].daily - forest[a].daily; });
    return [order[0], order[1]];
  }

  function mergeAt(i, j, sfxName) {
    var a = forest[i], b = forest[j];
    var junc = { kids: [a, b], daily: a.daily + b.daily, name: 'junction' };
    committed += junc.daily;
    juncCount++;
    var next = [];
    for (var k = 0; k < forest.length; k++) if (k !== i && k !== j) next.push(forest[k]);
    next.push(junc);
    forest = next;
    selected = [];
    if (sfxName) api.sfx(sfxName);
  }

  function finishTree() {
    lastCost = treeCost(forest[0]);
    if (gatePass(lastCost, parTarget, tolerance)) {
      phase = 'win';
      curHint = null;
      ladder.reset();
    } else {
      phase = 'lose';
      var h = ladder.fail();
      if (h) curHint = h;
      api.fail();
    }
  }

  function join() {
    if (selected.length !== 2) return;
    if (phase === 'free') snapshot();
    mergeAt(selected[0], selected[1], 'open');
    if (phase === 'free' && forest.length === 1) finishTree();
    render();
  }

  function undo() {
    if (phase !== 'free' || !history.length) return;
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

  function startOldPlanRun() {
    phase = 'forced-run';
    render();
    runTimer = setInterval(function () {
      if (forest.length > 1) {
        var bt = biggestTwoIdx();
        mergeAt(bt[0], bt[1], 'select');
        if (forest.length === 1) {
          clearInterval(runTimer); runTimer = null;
          phase = 'forced-end';
          api.sfx('bump');
        }
        render();
      } else { // safety: shouldn't happen
        clearInterval(runTimer); runTimer = null;
        phase = 'forced-end';
        render();
      }
    }, 340);
  }

  function replant() {
    resetForest();
    phase = 'free';
    render();
  }

  /* ---- DOM helpers ---- */

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function subEl(node) {
    var w = el('div', 'tp-node');
    if (node.kids) {
      var card = el('div', 'tp-card tp-junc tp-sub',
        '<span class="tp-name">junction</span><span class="tp-daily">' + node.daily + '/day</span>');
      w.appendChild(card);
      w.appendChild(el('div', 'tp-edge'));
      var kids = el('div', 'tp-junc-kids');
      kids.appendChild(subEl(node.kids[0]));
      kids.appendChild(subEl(node.kids[1]));
      w.appendChild(kids);
    } else {
      w.appendChild(el('div', 'tp-card tp-sub',
        '<span class="tp-name">' + esc(node.name) + '</span>' +
        '<span class="tp-daily">' + node.daily + '/day</span>'));
    }
    return w;
  }

  /* Root-level card: always a real <button> (44px+ target). `enabledSet`
     restricts selection to the two biggest (forced round); null = all. */
  function rootEl(node, idx, enabledSet, interactive) {
    var wrapN = el('div', 'tp-node');
    var card = el('button', 'tp-card tp-rootcard' + (node.kids ? ' tp-junc' : ''));
    card.type = 'button';
    card.dataset.idx = idx;
    card.dataset.daily = node.daily;
    if (node.kids) {
      card.innerHTML = '<span class="tp-tag">trail group</span>' +
        '<span class="tp-name">' + node.daily + '/day</span>';
    } else {
      card.innerHTML = '<span class="tp-name">' + esc(node.name) + '</span>' +
        '<span class="tp-daily">' + node.daily + ' walkers/day</span>';
    }
    var enabled = interactive && forest.length >= 2 &&
      (!enabledSet || enabledSet.indexOf(idx) >= 0);
    if (enabled) {
      if (selected.indexOf(idx) >= 0) card.classList.add('tp-sel');
      if (enabledSet) card.classList.add('tp-big');
      card.addEventListener('click', function () { toggleSelect(idx); });
    } else {
      card.disabled = true;
      if (interactive && enabledSet) card.classList.add('tp-dis');
    }
    wrapN.appendChild(card);
    if (node.kids) {
      wrapN.appendChild(el('div', 'tp-edge'));
      var kids = el('div', 'tp-junc-kids');
      kids.appendChild(subEl(node.kids[0]));
      kids.appendChild(subEl(node.kids[1]));
      wrapN.appendChild(kids);
    }
    return wrapN;
  }

  function forestBox(enabledSet, interactive) {
    var box = el('div', 'tp-forest');
    var row = el('div', 'tp-roots');
    forest.forEach(function (n, i) { row.appendChild(rootEl(n, i, enabledSet, interactive)); });
    box.appendChild(row);
    return box;
  }

  function meters(hot) {
    var m = el('div', 'tp-meters');
    var c1 = el('div', 'tp-meter' + (hot ? ' tp-hot' : ''),
      '<div class="tp-mlabel">Committed walk-cost</div>' +
      '<div class="tp-mval">' + committed + ' <small>walks/day</small></div>');
    m.appendChild(c1);
    var c2 = el('div', 'tp-meter');
    if (hot) {
      c2.innerHTML = '<div class="tp-mlabel">Junctions built</div>' +
        '<div class="tp-mval">' + juncCount + '</div>';
    } else if (!taughtMode) {
      c2.innerHTML = '<div class="tp-mlabel">Old plan — beat it</div>' +
        '<div class="tp-mval">' + forcedTotal + ' <small>walks/day</small></div>';
    } else {
      c2.innerHTML = '<div class="tp-mlabel">Target</div>' +
        '<div class="tp-mval">' + parTarget + ' <small>walks/day</small></div>';
    }
    m.appendChild(c2);
    m.appendChild(el('div', 'tp-meter',
      '<div class="tp-mlabel">Trailheads left</div>' +
      '<div class="tp-mval">' + forest.length + '</div>'));
    return m;
  }

  function joinControls() {
    var controls = el('div', 'tp-controls');
    var joinBtn = el('button', 'btn btn-primary', 'Join trails');
    joinBtn.type = 'button';
    joinBtn.disabled = selected.length !== 2;
    joinBtn.addEventListener('click', join);
    controls.appendChild(joinBtn);
    if (phase === 'free') {
      var undoBtn = el('button', 'btn', 'Undo');
      undoBtn.type = 'button';
      undoBtn.disabled = history.length === 0;
      undoBtn.addEventListener('click', undo);
      controls.appendChild(undoBtn);
    }
    return controls;
  }

  /* ---- phase views ---- */

  function renderHook(wrap) {
    wrap.appendChild(G.pz.hookCard({
      question: 'Cheapest plan: merge the two BUSIEST trailheads first, or the two quietest?',
      options: [
        { label: 'The two busiest', note: 'clear the crowds first' },
        { label: 'The two quietest', note: 'cheap joins first' },
      ],
      correct: 1,
      reveal: 'Huff: &ldquo;Everyone bets busiest — my <b>old plan</b> did too. ' +
        'Run the old plan and watch the cost ticker.&rdquo;',
      doneLabel: 'Run the old plan',
      onDone: function () { phase = 'forced'; resetForest(); render(); },
    }));
  }

  function renderForced(wrap) {
    wrap.appendChild(G.pz.roundBanner(1, 2, 'Huff’s old plan — busiest first'));
    if (phase === 'forced' && juncCount === 0) {
      wrap.appendChild(G.pz.coachCard('huff',
        'My old plan, pinned to the stump: <b>join the two busiest piles first</b>. ' +
        'Big trails, big junctions. Humor me — run it.'));
    }
    if (phase === 'forced' && juncCount >= FORCED) {
      wrap.appendChild(G.pz.coachCard('huff',
        'Feel that ticker? <b>Every walker pays for every junction above it</b> — ' +
        'and I just stacked the busiest folk under every fork.'));
    }
    wrap.appendChild(meters(true));
    var locked = phase === 'forced' && juncCount < FORCED;
    wrap.appendChild(forestBox(locked ? biggestTwoIdx() : null, locked));

    if (locked) {
      wrap.appendChild(joinControls());
      wrap.appendChild(el('div', 'tp-hint',
        'The old plan allows only the two <b>busiest</b> piles (hot outline). Tap both, then join.'));
    } else if (phase === 'forced') {
      var c = el('div', 'tp-controls');
      var runBtn = el('button', 'btn btn-primary', 'Let the old plan finish');
      runBtn.type = 'button';
      runBtn.addEventListener('click', startOldPlanRun);
      c.appendChild(runBtn);
      wrap.appendChild(c);
    } else if (phase === 'forced-run') {
      wrap.appendChild(el('div', 'tp-hint', 'The old plan runs on&hellip; watch the ticker.'));
    } else { // forced-end
      var box = el('div', 'tp-end tp-lose');
      box.appendChild(el('h3', null, 'Huff’s old plan, finished.'));
      box.appendChild(el('p', null,
        'Busiest-first costs <b>' + forcedTotal + '</b> walks/day. The busiest villages ' +
        'ended up at the bottom of the tree — under the most junctions.'));
      wrap.appendChild(box);
      wrap.appendChild(G.pz.coachCard('huff',
        '&hellip;Scrap it. Scrap the whole plan. We replant — <b>your</b> way this time. ' +
        'Beat <b>' + forcedTotal + '</b>.'));
      var c2 = el('div', 'tp-controls');
      var rep = el('button', 'btn btn-primary', 'Replant — your way');
      rep.type = 'button';
      rep.addEventListener('click', replant);
      c2.appendChild(rep);
      wrap.appendChild(c2);
    }
  }

  function loseCard() {
    var box = el('div', 'tp-end tp-lose');
    var over = lastCost - parTarget;
    var bestNote = parTarget === optimal ? ' — the provable best' : '';
    if (!taughtMode && lastCost >= forcedTotal) {
      box.appendChild(el('h3', null, 'The walkers grumble.'));
      box.appendChild(el('p', null,
        'This plan costs <b>' + lastCost + '</b> walks/day — no cheaper than the plan Huff ' +
        'scrapped (<b>' + forcedTotal + '</b>). Replant.'));
    } else if (!taughtMode) {
      box.appendChild(el('h3', null, 'Better — but not best.'));
      box.appendChild(el('p', null,
        '<b>' + lastCost + '</b> walks/day beats the scrapped plan (' + forcedTotal + ') by <b>' +
        (forcedTotal - lastCost) + '</b>. But the target is <b>' + parTarget + '</b>' + bestNote +
        ' — you are ' + over + ' over. Replant and find it.'));
    } else {
      box.appendChild(el('h3', null, 'The walkers grumble.'));
      box.appendChild(el('p', null,
        'This plan costs <b>' + lastCost + '</b> walks/day — <b>' + over + '</b> over the ' +
        'target of <b>' + parTarget + '</b>' + bestNote + '. Replant.'));
    }
    var rep = el('button', 'btn', 'Replant');
    rep.type = 'button';
    rep.style.alignSelf = 'flex-start';
    rep.addEventListener('click', replant);
    box.appendChild(rep);
    return box;
  }

  function winCards(wrap) {
    var leaves = leafDepths(forest[0]).sort(function (a, b) { return b.daily - a.daily; });
    var box = el('div', 'tp-end tp-win');
    box.appendChild(el('h3', null, 'The wood goes quiet — the path is clear.'));
    var parNote = parTarget > optimal
      ? ' (par ' + parTarget + ', optimum ' + optimal + ').'
      : ' — the provable optimum.';
    box.appendChild(el('p', 'tp-win-line',
      'Total cost <b>' + lastCost + '</b> walks/day' + parNote));

    var rows = '<tr><th>village</th><th>walkers/day</th><th>forks deep</th><th>daily×depth</th></tr>';
    var terms = [];
    leaves.forEach(function (L) {
      rows += '<tr><td>' + esc(L.name) + '</td><td>' + L.daily + '</td><td>' + L.depth +
        '</td><td>' + (L.daily * L.depth) + '</td></tr>';
      terms.push(L.daily + '×' + L.depth);
    });
    rows += '<tr class="tp-total"><td>total</td><td></td><td></td><td>' + lastCost + '</td></tr>';
    box.appendChild(el('table', 'tp-table', rows));
    box.appendChild(el('p', null,
      'cost = Σ daily×depth = ' + terms.join(' + ') + ' = <b>' + lastCost + '</b> — exactly ' +
      'your ticker, the sum of every junction&rsquo;s count. <b>Depth is code length; busy ' +
      'villages sit shallow.</b>'));
    wrap.appendChild(box);

    wrap.appendChild(G.pz.debriefCard({
      title: 'Two quietest first — every time. That IS Huffman.',
      tone: 'win',
      html: 'The greedy rule you just used is <b>Huffman&rsquo;s algorithm</b> (1952), and it is ' +
        'provably unbeatable — no trail plan averages fewer walks, no prefix code averages ' +
        'fewer bits. The scrapped busiest-first plan cost <span class="pzk-eq">' + forcedTotal +
        '</span>; yours costs <span class="pzk-eq">' + lastCost + '</span> — the wood saves ' +
        '<b>' + (forcedTotal - lastCost) + ' walks every day</b>. Sift&rsquo;s catalogue on the ' +
        'Dunes built question-trees by hand; Huff grows them: a village&rsquo;s depth here is ' +
        'exactly its codeword length there.',
      buttonLabel: 'Open the path',
      onButton: function () { G.pz.markTaught('tree-planner'); api.complete(); },
    }));
  }

  function renderFree(wrap) {
    if (!taughtMode && phase !== 'win') {
      wrap.appendChild(G.pz.roundBanner(2, 2, 'your plan — beat the scrapped one'));
    }
    if (curHint && phase !== 'win') wrap.appendChild(G.pz.coachCard('huff', curHint));
    wrap.appendChild(meters(false));
    if (phase === 'free') {
      wrap.appendChild(el('div', 'tp-hint',
        'Neat fact: the final cost is exactly the <b>sum of every junction&rsquo;s daily ' +
        'count</b> — the ticker above is your score-in-progress.'));
    }
    wrap.appendChild(forestBox(null, phase === 'free'));
    if (phase === 'free') {
      wrap.appendChild(joinControls());
      wrap.appendChild(el('div', 'tp-hint', selected.length === 2
        ? 'Two piles picked — press Join trails.'
        : 'Tap any two piles to join them under one junction.'));
    } else if (phase === 'lose') {
      wrap.appendChild(loseCard());
    } else {
      winCards(wrap);
    }
  }

  function render() {
    root.innerHTML = '';
    var wrap = el('div', 'tp-wrap');
    if (phase === 'trivial') {
      var box = el('div', 'tp-end tp-win');
      box.appendChild(el('h3', null, 'One trailhead plans itself.'));
      var b = el('button', 'btn btn-primary', 'Open the path');
      b.type = 'button';
      b.addEventListener('click', function () { api.complete(); });
      box.appendChild(b);
      wrap.appendChild(box);
      root.appendChild(wrap);
      api.status('');
      return;
    }
    if (phase === 'hook') renderHook(wrap);
    else if (phase === 'forced' || phase === 'forced-run' || phase === 'forced-end') renderForced(wrap);
    else renderFree(wrap);
    root.appendChild(wrap);
    updateStatus();
  }

  function updateStatus() {
    if (phase === 'hook') api.status('predict first');
    else if (phase === 'forced' || phase === 'forced-run') {
      api.status('old plan: committed ' + committed + ' walks/day');
    } else if (phase === 'forced-end') {
      api.status('old plan total: ' + forcedTotal + ' walks/day');
    } else if (phase === 'free') {
      api.status(taughtMode
        ? 'committed ' + committed + ' · target ' + parTarget
        : 'committed ' + committed + ' · beat ' + forcedTotal + ' · target ' + parTarget);
    } else if (phase === 'lose') {
      api.status('C = ' + lastCost + ' vs target ' + parTarget);
    } else if (phase === 'win') {
      api.status('C = ' + lastCost + ' ✓');
    }
  }

  resetForest();
  phase = villages.length < 2 ? 'trivial' : (taughtMode ? 'free' : 'hook');
  render();

  return {
    destroy: function () {
      if (runTimer) { clearInterval(runTimer); runTimer = null; }
      root.innerHTML = '';
    }
  };
}

G.puzzles.register('tree-planner', {
  title: 'Huff’s Trail Network', // plain text: the host sets it via textContent
  create: create,
  /* pure functions exposed for the scratch logic test (_smoke) — the overlay
     host only ever reads .title and .create */
  logic: {
    huffmanCost: huffmanCost,
    greedyMaxCost: greedyMaxCost,
    treeCost: treeCost,
    leafDepths: leafDepths,
    resolvePar: resolvePar,
    gatePass: gatePass,
    mergeWalk: mergeWalk,
  },
});

})();
