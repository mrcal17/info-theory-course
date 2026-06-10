/* THE QUIET ARCHIPELAGO — 'question-tree' puzzle (The Dune of Surprises).
   Sift's critter catalogue: build the cheapest yes/no interrogation. Start with
   the whole critter set as the root; split any leaf of >=2 critters into a
   YES bucket and a NO bucket. When every leaf is a single critter you have a
   code; your expected questions (Sum p*depth) is compared live against the
   entropy floor H and against par. Beat par to file the catalogue.
   Teaches: every yes/no question is a bit; no strategy averages below H.
   Contract: ../../DESIGN.md · host: ../core/overlay.js (api = complete, fail,
   close, sfx, status, rng). IIFE, no globals; ends in G.puzzles.register. */
(function () {
'use strict';

/* ---------------- pure logic (tested separately) ---------------- */

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

function fmt(x) { return (Math.round(x * 100) / 100).toFixed(2); }
function pctMass(m) { return (Math.round(m * 1000) / 10) + '%'; }

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
    '.qt-hint{color:var(--muted);font-size:0.8rem;margin-top:0.3rem;line-height:1.45;}' +
    '.qt-controls{display:flex;gap:0.6rem;flex-wrap:wrap;}' +
    '.qt-controls .btn{min-height:44px;}' +
    /* tree */
    '.qt-treebox{overflow-x:auto;padding:0.3rem 0.1rem;}' +
    '.qt-tree,.qt-tree ul{list-style:none;margin:0;padding:0;}' +
    '.qt-tree{display:flex;justify-content:center;}' +
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
    '.qt-leaf .qt-tap{font-size:0.64rem;color:var(--purple);margin-top:0.15rem;}' +
    /* split picker */
    '.qt-picker{border-color:var(--purple);}' +
    '.qt-picker h3{color:var(--purple);font-size:0.95rem;margin-bottom:0.5rem;}' +
    '.qt-picker .qt-pgrid{display:grid;gap:0.45rem;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:0.6rem;}' +
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
    /* lesson */
    '.qt-lesson{border-color:var(--green);}' +
    '.qt-lesson h3{color:var(--green);font-size:1rem;margin-bottom:0.4rem;}' +
    '.qt-lesson p{font-size:0.88rem;line-height:1.55;color:var(--text);}' +
    '.qt-lesson .qt-eq{color:var(--cyan);font-variant-numeric:tabular-nums;}';
  document.head.appendChild(s);
}

/* ---------------- mechanic ---------------- */

G.puzzles.register('question-tree', {
  title: 'The Critter Catalogue',
  create: function (root, config, api) {
    injectStyle();

    var critters = (config.critters || []).map(function (c) {
      return { name: c.name, p: c.p, key: c.key };
    });
    var parAvg = config.parAvg;
    var H = entropy(critters);

    // tree state + undo history (snapshots of split actions)
    var tree = makeLeaf(critters.slice());
    var history = []; // each entry: the node that was split (to revert)
    var picker = null; // { node } currently being split, or null
    var won = false;

    var wrap = document.createElement('div');
    wrap.className = 'qt-wrap';
    root.appendChild(wrap);

    // flavor
    var flavor = document.createElement('div');
    flavor.className = 'qt-flavor';
    flavor.innerHTML =
      'Sift drags out a battered card box. <b>"Every critter, sorted by one ' +
      'yes/no question at a time. Tap a pile of two or more to split it. Cheapest ' +
      'set of questions wins &mdash; ask the wrong ones and you\'ll feel the cost."</b>';
    wrap.appendChild(flavor);

    // meter
    var meter = document.createElement('div');
    meter.className = 'g-card qt-meter';
    wrap.appendChild(meter);

    // controls
    var controls = document.createElement('div');
    controls.className = 'qt-controls';
    var undoBtn = document.createElement('button');
    undoBtn.className = 'btn'; undoBtn.type = 'button'; undoBtn.textContent = 'Undo';
    var clearBtn = document.createElement('button');
    clearBtn.className = 'btn'; clearBtn.type = 'button'; clearBtn.textContent = 'Clear';
    controls.appendChild(undoBtn);
    controls.appendChild(clearBtn);
    wrap.appendChild(controls);

    // tree render box
    var treeBox = document.createElement('div');
    treeBox.className = 'qt-treebox';
    wrap.appendChild(treeBox);

    // slot for picker / lesson (below tree)
    var slot = document.createElement('div');
    wrap.appendChild(slot);

    /* ---- render the tree as nested DOM ---- */
    function renderTree() {
      treeBox.innerHTML = '';
      var rootWrap = document.createElement('div');
      rootWrap.className = 'qt-tree';
      rootWrap.appendChild(renderNode(tree));
      treeBox.appendChild(rootWrap);
    }

    function renderNode(node) {
      var box = document.createElement('div');
      box.className = 'qt-node';
      if (isLeaf(node)) {
        box.appendChild(renderLeaf(node));
        return box;
      }
      // internal question node
      var q = document.createElement('div');
      q.className = 'qt-q';
      q.innerHTML = '<div class="qt-qmark">?</div>' +
        '<div class="qt-qinfo">' + fmt(splitInfo(node)) + ' bits</div>';
      box.appendChild(q);

      var kids = document.createElement('div');
      kids.className = 'qt-children';
      kids.appendChild(renderChild(node.yes, 'YES'));
      kids.appendChild(renderChild(node.no, 'NO'));
      box.appendChild(kids);
      return box;
    }

    function renderChild(node, label) {
      var c = document.createElement('div');
      c.className = 'qt-child';
      var lab = document.createElement('div');
      lab.className = 'qt-edgelab ' + (label === 'YES' ? 'yes' : 'no');
      lab.textContent = label;
      c.appendChild(lab);
      c.appendChild(renderNode(node));
      return c;
    }

    function renderLeaf(node) {
      var multi = node.critters.length >= 2;
      var leaf = document.createElement(multi ? 'button' : 'div');
      leaf.className = 'qt-leaf ' + (multi ? 'multi' : 'single');
      if (multi) leaf.type = 'button';
      var names = node.critters.map(function (c) { return G.util.esc(c.name); }).join(', ');
      leaf.innerHTML =
        '<div class="qt-names">' + names + '</div>' +
        '<div class="qt-mass">mass ' + pctMass(massOf(node.critters)) + '</div>' +
        (multi ? '<div class="qt-tap">tap to split</div>' : '');
      if (multi) {
        leaf.addEventListener('click', function () {
          if (won) return;
          openPicker(node);
        });
      }
      return leaf;
    }

    /* ---- split picker ---- */
    function openPicker(node) {
      picker = { node: node };
      slot.innerHTML = '';
      var box = document.createElement('div');
      box.className = 'g-card qt-picker';
      box.innerHTML = '<h3>Split this pile: which go to YES?</h3>';

      var grid = document.createElement('div');
      grid.className = 'qt-pgrid';
      var chosen = {}; // key -> bool
      node.critters.forEach(function (c) {
        var b = document.createElement('button');
        b.className = 'qt-pick'; b.type = 'button';
        b.innerHTML = '<span class="qt-box"></span>' +
          '<span><span class="qt-pn">' + G.util.esc(c.name) + '</span> ' +
          '<span class="qt-pp">' + pctMass(c.p) + '</span></span>';
        b.addEventListener('click', function () {
          chosen[c.key] = !chosen[c.key];
          b.classList.toggle('on', !!chosen[c.key]);
          updateSummary();
          api.sfx('select');
        });
        grid.appendChild(b);
      });
      box.appendChild(grid);

      var summary = document.createElement('div');
      summary.className = 'qt-psum';
      box.appendChild(summary);

      var row = document.createElement('div');
      row.className = 'qt-prow';
      var doBtn = document.createElement('button');
      doBtn.className = 'btn btn-primary'; doBtn.type = 'button'; doBtn.textContent = 'Split';
      var cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-ghost'; cancelBtn.type = 'button'; cancelBtn.textContent = 'Cancel';
      row.appendChild(doBtn);
      row.appendChild(cancelBtn);
      box.appendChild(row);
      slot.appendChild(box);
      box.scrollIntoView({ block: 'nearest' });

      function yesList() { return node.critters.filter(function (c) { return chosen[c.key]; }); }
      function noList() { return node.critters.filter(function (c) { return !chosen[c.key]; }); }
      function updateSummary() {
        var y = yesList(), n = noList();
        var ok = y.length >= 1 && n.length >= 1;
        if (y.length === 0 && n.length === node.critters.length) {
          summary.innerHTML = 'Pick at least one critter for YES (the rest go NO).';
        } else if (!ok) {
          summary.innerHTML = 'Both sides must be non-empty &mdash; un-pick one for NO.';
        } else {
          // preview info of this question
          var my = massOf(y), mn = massOf(n), tot = my + mn, q = my / tot;
          var info = (q <= 0 || q >= 1) ? 0 : -(q * Math.log2(q) + (1 - q) * Math.log2(1 - q));
          summary.innerHTML = 'YES: ' + y.length + ' (mass ' + pctMass(my) + ') &middot; ' +
            'NO: ' + n.length + ' (mass ' + pctMass(mn) + ') &middot; this question carries <b>' +
            fmt(info) + ' bits</b>.';
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
        picker = null;
        slot.innerHTML = '';
        api.sfx('open');
        renderTree();
        refreshMeter();
      });
      cancelBtn.addEventListener('click', function () {
        picker = null;
        slot.innerHTML = '';
        api.sfx('close');
      });
    }

    /* ---- meter + win detection ---- */
    function refreshMeter() {
      var solved = allLeavesSingle(tree);
      var leavesLeft = countLeaves(tree, true); // multi-critter leaves remaining

      var yoursHtml, hint;
      if (solved) {
        var eq = expectedQuestions(tree);
        var beat = eq <= parAvg + 1e-9;
        yoursHtml =
          '<div class="qt-line qt-yours' + (beat ? ' beat' : '') + '"><span>Your tree</span>' +
          '<span><b>' + fmt(eq) + '</b> expected questions</span></div>';
        meter.innerHTML =
          yoursHtml +
          '<div class="qt-line qt-floor"><span>Floor (entropy)</span><span>H = <b>' + fmt(H) + '</b> bits</span></div>' +
          '<div class="qt-line qt-par"><span>Target</span><span>&le; <b>' + fmt(parAvg) + '</b></span></div>';
        if (beat) {
          meter.innerHTML += '<div class="qt-hint">You beat par. No yes/no strategy can do better than H = ' +
            fmt(H) + ' bits &mdash; you are close to the floor.</div>';
        } else {
          meter.innerHTML += '<div class="qt-hint">Above target. Undo and ask questions that split the ' +
            'probability mass more evenly &mdash; or peel the likeliest critter off first.</div>';
        }
        showFileButton(beat, eq);
      } else {
        meter.innerHTML =
          '<div class="qt-line"><span>Tree</span><span>' + leavesLeft +
          ' pile' + (leavesLeft === 1 ? '' : 's') + ' still to split</span></div>' +
          '<div class="qt-line qt-floor"><span>Floor (entropy)</span><span>H = <b>' + fmt(H) + '</b> bits</span></div>' +
          '<div class="qt-line qt-par"><span>Target</span><span>&le; <b>' + fmt(parAvg) + '</b> expected questions</span></div>' +
          '<div class="qt-hint">Keep splitting until every pile is a single critter, then the score appears.</div>';
        clearLesson();
      }

      // live status line
      var statusTail;
      if (solved) {
        statusTail = 'expected ' + fmt(expectedQuestions(tree)) + ' q';
      } else {
        statusTail = leavesLeft + ' pile' + (leavesLeft === 1 ? '' : 's') + ' to split';
      }
      api.status(statusTail + ' &middot; floor H = ' + fmt(H) + ' &middot; target &le; ' + fmt(parAvg));

      undoBtn.disabled = history.length === 0;
      clearBtn.disabled = history.length === 0;
    }

    var lessonEl = null;
    function clearLesson() {
      if (lessonEl && lessonEl.parentNode) lessonEl.parentNode.removeChild(lessonEl);
      lessonEl = null;
    }
    function showFileButton(beat, eq) {
      clearLesson();
      lessonEl = document.createElement('div');
      lessonEl.className = 'g-card' + (beat ? ' qt-lesson' : '');
      if (beat) {
        lessonEl.innerHTML =
          '<h3>&#10003; A code, built by hand.</h3>' +
          '<p>Every yes/no question is a <b>bit</b>. Your interrogation averages ' +
          '<span class="qt-eq">' + fmt(eq) + '</span> questions per critter &mdash; at or below par. ' +
          'No questioning strategy can average below the entropy ' +
          '<span class="qt-eq">H = ' + fmt(H) + '</span> bits. You just built a code.</p>';
        var fileBtn = document.createElement('button');
        fileBtn.className = 'btn btn-primary'; fileBtn.type = 'button';
        fileBtn.style.minHeight = '44px';
        fileBtn.textContent = 'File the catalogue';
        fileBtn.addEventListener('click', function () {
          if (won) return;
          won = true;
          api.complete();
        });
        lessonEl.appendChild(fileBtn);
      } else {
        lessonEl.innerHTML =
          '<p style="color:var(--muted);font-size:0.85rem;line-height:1.5;">' +
          'A complete tree &mdash; but it asks ' + fmt(eq) + ' questions on average, over the ' +
          'target of ' + fmt(parAvg) + '. Sift wants it cheaper. <b style="color:var(--orange)">' +
          'Undo</b> and try splitting the mass more evenly.</p>';
      }
      wrap.appendChild(lessonEl);
      lessonEl.scrollIntoView({ block: 'nearest' });
    }

    /* ---- undo / clear ---- */
    undoBtn.addEventListener('click', function () {
      if (won || history.length === 0) return;
      var node = history.pop();
      node.yes = null;
      node.no = null;
      picker = null;
      slot.innerHTML = '';
      api.sfx('close');
      renderTree();
      refreshMeter();
    });
    clearBtn.addEventListener('click', function () {
      if (won) return;
      tree = makeLeaf(critters.slice());
      history = [];
      picker = null;
      slot.innerHTML = '';
      api.sfx('close');
      renderTree();
      refreshMeter();
    });

    renderTree();
    refreshMeter();

    return {
      destroy: function () { /* no global timers/listeners to clean up */ }
    };
  }
});

})();
