/* THE QUIET ARCHIPELAGO — prefix-gate ('prefix-gate')
   The signpost gate of Huffman Wood, reworked per PEDAGOGY.md §6.6 (POLISH+).

   Teaching loop:
     HOOK        — "lengths {1,2,2}: can they coexist prefix-free?" (yes —
                   ½+¼+¼ = 1, exactly full vessel), via G.pz.hookCard.
     IMPOSSIBLE  — a traveler asks for whistle lengths {1,1,2}. The player may
                   try (the vessel overflows; two depth-1 signs burn the whole
                   tree) but the round's gate is the refusal button:
                   "It can't be done — the vessel overflows."
     MAIN        — the original construction, unchanged gate (all three rules
                   green), now beside a BURN-TREE: assigning a codeword marks
                   its node and greys out (burns) its entire subtree. The
                   Kraft vessel and the burn-tree are the same fact twice.
     DEBRIEF     — their Kraft sum, their L̄ vs H(freq distribution), and
                   "short codes for busy roads — that's all compression is."

   The three live rules (the final gate, unchanged from before):
     1. prefix-free — no codeword may start another;
     2. the Kraft vessel Σ2^(−lenᵢ) ≤ 1 — never overflows;
     3. weighted average length Σ(freqᵢ·lenᵢ)/Σfreqᵢ ≤ maxBits.

   Repeat encounters (G.pz.taught('prefix-gate')) skip the hook and the
   impossible round and open directly on the main build.

   Config: { dests:[{name, freq}], maxBits:n }  (config must be solvable)
   No globals; pure logic first, UI after; one <style> (prefix `pg-`). */
(function () {
'use strict';

/* ----------------------------- pure logic ----------------------------- */

/* code = string of '0'/'1'. Is `a` a prefix of `b`? */
function isPrefix(a, b) {
  return b.length >= a.length && b.slice(0, a.length) === a;
}

/* All unordered pairs [i,j] (i<j) where one nonempty code prefixes the other. */
function prefixViolations(codes) {
  var out = [];
  for (var i = 0; i < codes.length; i++) {
    for (var j = i + 1; j < codes.length; j++) {
      var a = codes[i], b = codes[j];
      if (!a || !b) continue;
      if (isPrefix(a, b) || isPrefix(b, a)) out.push([i, j]);
    }
  }
  return out;
}

/* Kraft sum Σ 2^(−len) over nonempty codes. */
function kraftSum(codes) {
  var s = 0;
  for (var i = 0; i < codes.length; i++) if (codes[i]) s += Math.pow(2, -codes[i].length);
  return s;
}

/* Weighted average code length Σ(freqᵢ·lenᵢ)/Σfreqᵢ. */
function weightedAvg(codes, freqs) {
  var num = 0, den = 0;
  for (var i = 0; i < codes.length; i++) { den += freqs[i]; num += freqs[i] * codes[i].length; }
  return den === 0 ? 0 : num / den;
}

/* Optimal code-length MULTISET (ascending) for given freqs via Huffman depths. */
function huffmanLengths(freqs) {
  if (freqs.length === 0) return [];
  if (freqs.length === 1) return [1];
  var pool = freqs.map(function (w) { return { weight: w, members: [{ d: 0 }] }; });
  while (pool.length > 1) {
    pool.sort(function (a, b) { return a.weight - b.weight; });
    var a = pool.shift(), b = pool.shift(), members = [];
    a.members.forEach(function (m) { members.push({ d: m.d + 1 }); });
    b.members.forEach(function (m) { members.push({ d: m.d + 1 }); });
    pool.push({ weight: a.weight + b.weight, members: members });
  }
  return pool[0].members.map(function (m) { return m.d; }).sort(function (a, b) { return a - b; });
}

/* Canonical prefix-free codewords for an ASCENDING length multiset.
   c₁ = 0…0; cᵢ = (cᵢ₋₁+1)·2^(lᵢ−lᵢ₋₁). Used by hint 3 and nowhere else. */
function canonicalCodes(lengths) {
  var out = [], v = 0;
  for (var i = 0; i < lengths.length; i++) {
    if (i > 0) v = (v + 1) * Math.pow(2, lengths[i] - lengths[i - 1]);
    var s = v.toString(2);
    while (s.length < lengths[i]) s = '0' + s;
    out.push(s);
  }
  return out;
}

/* Burn-tree depth for a config: deep enough for an optimal code, ≥2, ≤5. */
function treeDepthFor(freqs) {
  var ls = huffmanLengths(freqs);
  var m = ls.length ? ls[ls.length - 1] : 2;
  return Math.max(2, Math.min(5, m));
}

/* The gate predicate (MAIN round): all three rules, exactly as before. */
function gateState(codes, freqs, maxBits) {
  var viols = prefixViolations(codes);
  var allFilled = codes.length > 0 && codes.every(function (c) { return c.length > 0; });
  var kraft = kraftSum(codes);
  var avg = weightedAvg(codes, freqs);
  return {
    allFilled: allFilled, viols: viols, kraft: kraft, avg: avg,
    ok: allFilled && viols.length === 0 && kraft <= 1 + 1e-9 && avg <= maxBits + 1e-9,
  };
}

/* --------------------------------- UI --------------------------------- */

var STYLE_ID = 'pg-style';
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  var css =
  '.pg-wrap{display:flex;flex-direction:column;gap:.8rem}' +
  '.pg-intro{color:var(--muted);font-size:.9rem;line-height:1.5}' +
  '.pg-intro b{color:var(--text)}' +
  '.pg-rows{display:flex;flex-direction:column;gap:.5rem}' +
  '.pg-row{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;background:var(--surface);' +
    'border:1px solid var(--surface2);border-radius:10px;padding:.5rem .6rem;transition:border-color .12s}' +
  '.pg-row.pg-bad{border-color:var(--red)}' +
  '.pg-dest{flex:1 1 120px;min-width:0}' +
  '.pg-dest .pg-name{font-size:.9rem;color:var(--text)}' +
  '.pg-dest .pg-freq{font-size:.72rem;color:var(--dim)}' +
  '.pg-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:.4rem}' +
  '.pg-code{display:flex;gap:.18rem;align-items:center;min-width:104px;min-height:32px;' +
    'font-size:1.2rem;letter-spacing:.05em;flex-wrap:wrap}' +
  '.pg-sym{color:var(--blue)}' +
  '.pg-sym.pg-one{color:var(--purple)}' +
  '.pg-row.pg-bad .pg-sym{color:var(--red)}' +
  '.pg-empty{color:var(--dim);font-size:.78rem;font-style:italic}' +
  '.pg-len{font-size:.7rem;color:var(--dim);min-width:34px}' +
  '.pg-btns{display:flex;gap:.3rem}' +
  '.pg-mini{min-width:44px;min-height:44px;border-radius:8px;border:2px solid var(--surface2);' +
    'background:var(--bg);color:var(--text);font-size:1.05rem;cursor:pointer;padding:0}' +
  '.pg-mini:hover:not(:disabled){border-color:var(--blue);color:var(--blue)}' +
  '.pg-mini:disabled{opacity:.35;cursor:default}' +
  '.pg-mini.pg-zero{color:var(--blue)}.pg-mini.pg-one{color:var(--purple)}' +
  '.pg-tree{background:var(--surface);border:1px solid var(--surface2);border-radius:10px;' +
    'padding:.55rem .7rem .45rem}' +
  '.pg-tree svg{display:block;width:100%;max-width:560px;margin:0 auto;height:auto}' +
  '.pg-gauges{display:flex;gap:.6rem;flex-wrap:wrap}' +
  '.pg-gauge{flex:1 1 150px;background:var(--surface);border:1px solid var(--surface2);' +
    'border-radius:10px;padding:.55rem .7rem}' +
  '.pg-glabel{font-size:.66rem;letter-spacing:.07em;text-transform:uppercase;color:var(--dim)}' +
  '.pg-gval{font-size:1.05rem;font-weight:600;color:var(--text);margin:.15rem 0}' +
  '.pg-gval.pg-ok{color:var(--green)}.pg-gval.pg-over{color:var(--red)}' +
  '.pg-vessel{height:12px;background:var(--surface2);border-radius:6px;overflow:hidden;position:relative;' +
    'border:1px solid var(--border)}' +
  '.pg-vessel-fill{height:100%;background:var(--cyan);width:0;transition:width .25s}' +
  '.pg-vessel-fill.pg-over{background:var(--red)}' +
  '.pg-vessel-mark{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--text);right:0;opacity:.5}' +
  '.pg-grule{font-size:.66rem;color:var(--dim);margin-top:.2rem;line-height:1.4}' +
  '.pg-alert{font-size:.82rem;color:var(--red);line-height:1.45;background:rgba(248,113,113,.08);' +
    'border:1px solid rgba(248,113,113,.35);border-radius:8px;padding:.5rem .65rem}' +
  '.pg-foot{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center}' +
  '.pg-foot .btn{min-height:44px}' +
  '.pg-refuse{border-color:rgba(248,113,113,.55);color:var(--red)}' +
  '.pg-refuse:hover:not(:disabled){border-color:var(--red);color:var(--red)}';
  var el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = css;
  document.head.appendChild(el);
}

/* Palette cycle for destination markers (tree nodes + row dots). */
var COLORS = ['var(--blue)', 'var(--orange)', 'var(--green)', 'var(--purple)',
  'var(--cyan)', 'var(--pink)', 'var(--yellow)', 'var(--gold)'];

function symHtml(code) {
  if (!code) return '<span class="pg-empty">(no whistle yet)</span>';
  var out = '';
  for (var i = 0; i < code.length; i++) {
    out += code[i] === '0'
      ? '<span class="pg-sym">&#9679;</span>'          // ● dot = 0
      : '<span class="pg-sym pg-one">&#9711;</span>';  // ○ circle = 1
  }
  return out;
}
function symText(code) {
  var out = '';
  for (var i = 0; i < code.length; i++) out += code[i] === '0' ? '●' : '◯';
  return out;
}

/* ---------------------------- burn-tree SVG ---------------------------- */
/* A binary tree of `depth` levels. Each nonempty code marks its node with
   its destination color; the node's entire subtree is greyed out (burnt).
   Codes in `badSet` (prefix violations) show red. Legible at 420px. */
function treeSVG(depth, codes, names, badSet) {
  var rowH = 34, padT = 16, padB = 14;
  var W = Math.max(300, Math.pow(2, depth) * 24);
  var H = padT + depth * rowH + padB;
  function X(d, i) { return (i + 0.5) * W / Math.pow(2, d); }
  function Y(d) { return padT + d * rowH; }
  function state(path) {
    var st = { idx: -1, burn: false, on: false };
    for (var i = 0; i < codes.length; i++) {
      var c = codes[i];
      if (!c) continue;
      if (c === path) { if (st.idx < 0) st.idx = i; }
      else if (isPrefix(c, path)) st.burn = true;
      else if (isPrefix(path, c)) st.on = true;
    }
    return st;
  }
  var edges = '', nodes = '', d, i, path, st;
  for (d = 1; d <= depth; d++) {
    for (i = 0; i < Math.pow(2, d); i++) {
      path = i.toString(2); while (path.length < d) path = '0' + path;
      st = state(path);
      var x1 = X(d - 1, i >> 1), y1 = Y(d - 1), x2 = X(d, i), y2 = Y(d);
      var stroke, swidth = 1.5, sop = 1;
      if (st.idx >= 0) { stroke = badSet[st.idx] ? 'var(--red)' : COLORS[st.idx % COLORS.length]; swidth = 2.5; }
      else if (st.on) { stroke = 'var(--muted)'; swidth = 2; }
      else if (st.burn) { stroke = 'var(--dim)'; sop = 0.16; }
      else { stroke = 'var(--surface2)'; sop = 0.85; }
      edges += '<line x1="' + x1.toFixed(1) + '" y1="' + y1 + '" x2="' + x2.toFixed(1) +
        '" y2="' + y2 + '" style="stroke:' + stroke + ';stroke-width:' + swidth +
        ';opacity:' + sop + '"/>';
      if (d === 1) {
        var lx = (x1 + x2) / 2 + (i === 0 ? -11 : 11);
        edges += '<text x="' + lx.toFixed(1) + '" y="' + ((y1 + y2) / 2 + 3) +
          '" text-anchor="middle" style="font-size:11px;fill:' +
          (i === 0 ? 'var(--blue)' : 'var(--purple)') + '">' +
          (i === 0 ? '●' : '◯') + '</text>';
      }
    }
  }
  for (d = 1; d <= depth; d++) {
    for (i = 0; i < Math.pow(2, d); i++) {
      path = i.toString(2); while (path.length < d) path = '0' + path;
      st = state(path);
      var cx = X(d, i).toFixed(1), cy = Y(d);
      if (st.idx >= 0) {
        var bad = !!badSet[st.idx];
        var fill = bad ? 'var(--red)' : COLORS[st.idx % COLORS.length];
        var initial = (names[st.idx] || '?').charAt(0).toUpperCase();
        nodes += '<g><circle cx="' + cx + '" cy="' + cy + '" r="8.5" style="fill:' + fill +
          ';stroke:rgba(255,255,255,.75);stroke-width:1.5"/>' +
          '<text x="' + cx + '" y="' + (cy + 3) + '" text-anchor="middle" ' +
          'style="font-size:8.5px;font-weight:700;fill:#0b1020">' + G.util.esc(initial) + '</text>' +
          '<title>' + G.util.esc(names[st.idx] || '') + ' — ' + symText(path) + '</title></g>';
      } else if (st.burn) {
        nodes += '<circle cx="' + cx + '" cy="' + cy + '" r="5" style="fill:var(--dim);opacity:.22"/>';
      } else if (st.on) {
        nodes += '<circle cx="' + cx + '" cy="' + cy + '" r="5.5" style="fill:var(--surface);' +
          'stroke:var(--muted);stroke-width:1.5"/>';
      } else {
        nodes += '<circle cx="' + cx + '" cy="' + cy + '" r="5" style="fill:var(--bg);' +
          'stroke:var(--surface2);stroke-width:1.5"/>';
      }
    }
  }
  var rootOn = state('').on || codes.some(function (c) { return !!c; });
  var stump = '<rect x="' + (W / 2 - 7).toFixed(1) + '" y="' + (padT - 6) +
    '" width="14" height="10" rx="3" style="fill:var(--surface2);stroke:' +
    (rootOn ? 'var(--muted)' : 'var(--border)') + ';stroke-width:1.5"/>';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" ' +
    'role="img" aria-label="burn tree">' + edges + stump + nodes + '</svg>';
}

/* ------------------------------ create() ------------------------------ */

function create(root, config, api) {
  injectStyle();

  var dests = (config.dests || []).map(function (d, i) {
    return { id: i, name: String(d.name), freq: d.freq | 0 };
  });
  var maxBits = +config.maxBits;
  var freqs = dests.map(function (d) { return d.freq; });
  var names = dests.map(function (d) { return d.name; });
  var totalFreq = freqs.reduce(function (a, b) { return a + b; }, 0);
  var DEPTH = treeDepthFor(freqs);          // main-round tree + code-length cap

  var codes = dests.map(function () { return ''; });   // main round
  var solved = false;
  var currentHint = null;

  /* impossible-request round: lengths {1,1,2} */
  var IMP = [
    { name: 'First whistle', req: 1 },
    { name: 'Second whistle', req: 1 },
    { name: 'Third whistle', req: 2 },
  ];
  var impCodes = ['', '', ''];
  var impNames = IMP.map(function (r) { return r.name; });
  var IMP_DEPTH = 2;

  var taughtBefore = G.pz.taught('prefix-gate');
  var phase = taughtBefore ? 'main' : 'hook';   // hook → impossible → main → debrief

  /* hint ladder (§1.7): h1 nudge, h2 principle, h3 a working assignment */
  var hints = (function () {
    var order = dests.map(function (d, i) { return i; })
      .sort(function (a, b) { return freqs[b] - freqs[a] || a - b; });
    var lens = huffmanLengths(freqs);
    var canon = canonicalCodes(lens);
    var plan = order.map(function (di, k) {
      return G.util.esc(names[di]) + ' <b>' + symText(canon[k]) + '</b>';
    }).join(' &middot; ');
    return [
      'Busy roads, short whistles. Start the road asked for <b>most</b> on the shortest code, ' +
        'and push the quiet ones deeper.',
      'A 1-bit whistle burns <b>half the tree</b> and half-fills the vessel — you can afford at ' +
        'most one, and it belongs to the busiest road.',
      'Here, my own plan: ' + plan + '. Copy it — or swap any ● for ◯ at the same depth.',
    ];
  })();
  var ladder = G.pz.hintLadder(hints);

  /* ------------------------- shared UI pieces ------------------------- */

  function miniBtn(html, cls, disabled, fn, title) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pg-mini ' + cls;
    b.innerHTML = html;
    b.title = title || '';
    b.disabled = !!disabled;
    if (!disabled) b.addEventListener('click', fn);
    return b;
  }

  function fmt(x) {
    if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
    return (Math.round(x * 100) / 100).toFixed(2).replace(/0$/, '');
  }

  /* one code row. opts: {sub, cap, color?, bad, readonly, onTap(bit), onBack} */
  function rowEl(name, code, opts) {
    var row = document.createElement('div');
    row.className = 'pg-row' + (opts.bad ? ' pg-bad' : '');
    var dest = document.createElement('div');
    dest.className = 'pg-dest';
    dest.innerHTML = '<div class="pg-name">' +
      (opts.color ? '<span class="pg-dot" style="background:' + opts.color + '"></span>' : '') +
      G.util.esc(name) + '</div><div class="pg-freq">' + opts.sub + '</div>';
    row.appendChild(dest);
    var codeEl = document.createElement('div');
    codeEl.className = 'pg-code';
    codeEl.innerHTML = symHtml(code);
    row.appendChild(codeEl);
    var lenEl = document.createElement('div');
    lenEl.className = 'pg-len';
    lenEl.textContent = code.length + ' bit' + (code.length === 1 ? '' : 's');
    row.appendChild(lenEl);
    if (!opts.readonly) {
      var btns = document.createElement('div');
      btns.className = 'pg-btns';
      var full = code.length >= opts.cap;
      btns.appendChild(miniBtn('&#9679;', 'pg-zero', full, function () { opts.onTap('0'); }, 'append dot (0)'));
      btns.appendChild(miniBtn('&#9711;', 'pg-one', full, function () { opts.onTap('1'); }, 'append circle (1)'));
      btns.appendChild(miniBtn('&larr;', '', code.length === 0, opts.onBack, 'backspace'));
      row.appendChild(btns);
    }
    return row;
  }

  /* prefix-clash explainer (first clash pair). */
  function alertEl(viols, codesArr, nameArr) {
    var pair = viols[0];
    var alert = document.createElement('div');
    alert.className = 'pg-alert';
    var a = codesArr[pair[0]], b = codesArr[pair[1]];
    var shorter = a.length <= b.length ? a : b;
    alert.innerHTML = 'A traveler hearing <b>' + symHtml(shorter) + '</b> couldn&rsquo;t tell if the ' +
      'message ended — <b>prefix-free</b> means no codeword starts another. ' +
      G.util.esc(nameArr[pair[0]]) + ' and ' + G.util.esc(nameArr[pair[1]]) + ' clash' +
      (viols.length > 1 ? ' (+' + (viols.length - 1) + ' more)' : '') + '.';
    return alert;
  }

  /* the burn-tree panel — vessel's twin. */
  function treePanel(depth, codesArr, nameArr, badSet) {
    var p = document.createElement('div');
    p.className = 'pg-tree';
    p.innerHTML = '<div class="pg-glabel">The whistle tree</div>' +
      treeSVG(depth, codesArr, nameArr, badSet) +
      '<div class="pg-grule">A whistle is a walk down from the stump: ● left, ◯ right. ' +
      'Carving a sign <b>burns</b> every longer whistle beneath it.</div>';
    return p;
  }

  function vesselGauge(kraft) {
    var kg = document.createElement('div');
    kg.className = 'pg-gauge';
    var kOver = kraft > 1 + 1e-9;
    kg.innerHTML =
      '<div class="pg-glabel">Kraft vessel &Sigma;2^(&minus;len)</div>' +
      '<div class="pg-gval ' + (kOver ? 'pg-over' : (Math.abs(kraft - 1) < 1e-9 ? 'pg-ok' : '')) +
        '">' + fmt(kraft) + ' / 1.00</div>' +
      '<div class="pg-vessel"><div class="pg-vessel-fill ' + (kOver ? 'pg-over' : '') +
        '" style="width:' + Math.min(100, kraft * 100) + '%"></div>' +
        '<div class="pg-vessel-mark"></div></div>' +
      '<div class="pg-grule">This never fits past 1.0 — that&rsquo;s the Kraft inequality.</div>';
    return kg;
  }

  function avgGauge(avg, allFilled) {
    var ag = document.createElement('div');
    ag.className = 'pg-gauge';
    var aOver = allFilled && avg > maxBits + 1e-9;
    var aGood = allFilled && avg <= maxBits + 1e-9;
    ag.innerHTML =
      '<div class="pg-glabel">Avg length L&#772; vs budget</div>' +
      '<div class="pg-gval ' + (aOver ? 'pg-over' : (aGood ? 'pg-ok' : '')) + '">' +
        (allFilled ? fmt(avg) : '&mdash;') + ' / ' + fmt(maxBits) + ' bits</div>' +
      '<div class="pg-vessel"><div class="pg-vessel-fill ' + (aOver ? 'pg-over' : '') +
        '" style="width:' + (allFilled ? Math.min(100, (avg / maxBits) * 100) : 0) + '%' +
        ';background:' + (aGood ? 'var(--green)' : '') + '"></div></div>' +
      '<div class="pg-grule">Weighted by how often each road is asked for.</div>';
    return ag;
  }

  /* ------------------------------ phases ------------------------------ */

  function render() {
    root.innerHTML = '';
    if (phase === 'hook') renderHook();
    else if (phase === 'impossible') renderImpossible();
    else if (phase === 'debrief') renderDebrief();
    else renderMain();
  }

  /* HOOK — predict-then-find-out (§6.6). */
  function renderHook() {
    var wrap = document.createElement('div');
    wrap.className = 'pg-wrap';
    wrap.appendChild(G.pz.coachCard('huff',
      'Before you carve a single sign — a bet. Night travelers whistle their road with no ' +
      'gaps between codes, so <b>no whistle may begin another</b>.'));
    wrap.appendChild(G.pz.hookCard({
      question: 'Three whistle-codes, of lengths 1, 2 and 2 — can they live together prefix-free?',
      options: [
        { label: 'Yes', note: 'they can fit' },
        { label: 'No', note: 'they must collide' },
      ],
      correct: 0,
      reveal: 'They fit <b>exactly</b>: ●, ◯●, ◯◯. A length-1 whistle ' +
        'fills <b>½</b> the vessel; each length-2 fills <b>¼</b>. ' +
        '½ + ¼ + ¼ = <b>1</b> — exactly full, nothing to spare.',
      doneLabel: 'Let’s find out',
      onDone: function () { phase = 'impossible'; api.sfx('select'); render(); },
    }));
    root.appendChild(wrap);
    api.status('a bet at the workshop door');
  }

  /* IMPOSSIBLE REQUEST — the gate is the refusal button (§6.6). */
  var impRefused = false;
  function renderImpossible() {
    var wrap = document.createElement('div');
    wrap.className = 'pg-wrap';
    wrap.appendChild(G.pz.roundBanner(1, 2, 'the traveler’s request'));

    if (!impRefused) {
      wrap.appendChild(G.pz.coachCard('huff',
        'A traveler wants three whistles: <b>two single notes and one double</b> — lengths ' +
        '{1, 1, 2}. Carve them… or tell the truth.'));

      var viols = prefixViolations(impCodes);
      var badSet = {};
      viols.forEach(function (p) { badSet[p[0]] = true; badSet[p[1]] = true; });

      var rows = document.createElement('div');
      rows.className = 'pg-rows';
      IMP.forEach(function (r, idx) {
        rows.appendChild(rowEl(r.name, impCodes[idx], {
          sub: 'must be ' + r.req + ' bit' + (r.req === 1 ? '' : 's'),
          cap: r.req,
          color: COLORS[idx % COLORS.length],
          bad: !!badSet[idx],
          onTap: function (bit) { impCodes[idx] += bit; api.sfx('select'); render(); },
          onBack: function () { impCodes[idx] = impCodes[idx].slice(0, -1); api.sfx('select'); render(); },
        }));
      });
      wrap.appendChild(rows);
      if (viols.length) wrap.appendChild(alertEl(viols, impCodes, impNames));

      wrap.appendChild(treePanel(IMP_DEPTH, impCodes, impNames, badSet));
      var kraft = kraftSum(impCodes);
      var gauges = document.createElement('div');
      gauges.className = 'pg-gauges';
      gauges.appendChild(vesselGauge(kraft));
      wrap.appendChild(gauges);

      if (kraft > 1 + 1e-9) {
        wrap.appendChild(G.pz.coachCard('huff',
          'Half the vessel, plus half, plus a quarter — <b>past the brim</b>. ' +
          'The tree was ash before the third whistle landed.'));
      } else if (kraft >= 1 - 1e-9 && impCodes.some(function (c) { return !c; })) {
        wrap.appendChild(G.pz.coachCard('huff',
          'The vessel is exactly full and every branch is ash. Where can the next whistle live?'));
      }

      var foot = document.createElement('div');
      foot.className = 'pg-foot';
      var carve = document.createElement('button');
      carve.className = 'btn btn-primary';
      carve.textContent = 'Carve the signs';
      carve.addEventListener('click', function () {
        var filled = impCodes.every(function (c, i) { return c.length === IMP[i].req; });
        if (!filled) api.fail('Whistles missing — fill all three, or say it can’t be done.');
        else api.fail('The whistles collide — no traveler could tell where one ends.');
        render();
      });
      foot.appendChild(carve);
      var refuse = document.createElement('button');
      refuse.className = 'btn pg-refuse';
      refuse.textContent = 'It can’t be done — the vessel overflows.';
      refuse.addEventListener('click', function () {
        impRefused = true;
        api.sfx('spark');
        render();
      });
      foot.appendChild(refuse);
      wrap.appendChild(foot);
      api.status('Kraft ' + fmt(kraft) + ' / 1.00');
    } else {
      /* refusal reveal: show the evidence (their attempt, or a demo) burnt. */
      var shown = impCodes.some(function (c) { return !!c; }) ? impCodes : ['0', '1', '01'];
      var v2 = prefixViolations(shown);
      var bad2 = {};
      v2.forEach(function (p) { bad2[p[0]] = true; bad2[p[1]] = true; });
      wrap.appendChild(treePanel(IMP_DEPTH, shown, impNames, bad2));
      var g2 = document.createElement('div');
      g2.className = 'pg-gauges';
      g2.appendChild(vesselGauge(kraftSum(shown)));
      wrap.appendChild(g2);
      wrap.appendChild(G.pz.debriefCard({
        tone: 'info',
        title: 'Right — it can’t be done.',
        html: '&Sigma;2<sup>&minus;len</sup> = ½ + ½ + ¼ = ' +
          '<span class="pzk-eq">1.25</span> — over the brim. The two single notes burn ' +
          '<b>both</b> branches of the tree; the double whistle has nowhere to grow. ' +
          'The vessel isn’t advice — it’s the <b>Kraft inequality</b>, and here it refuses for you.',
        buttonLabel: 'On to the signposts',
        onButton: function () { phase = 'main'; api.sfx('select'); render(); },
      }));
      api.status('refused — Kraft 1.25 > 1');
    }
    root.appendChild(wrap);
  }

  /* MAIN — the original construction; gate = all three rules green. */
  function renderMain() {
    var wrap = document.createElement('div');
    wrap.className = 'pg-wrap';
    if (!taughtBefore) wrap.appendChild(G.pz.roundBanner(2, 2, 'the signpost gate'));

    var intro = document.createElement('div');
    intro.className = 'pg-intro';
    intro.innerHTML = 'Give each destination a whistle-code: <b>&#9679;</b> = 0 (dot), ' +
      '<b>&#9711;</b> = 1 (circle). Busy roads deserve short codes. Keep it ' +
      '<b>prefix-free</b>, under the Kraft line, and within the bit budget.';
    wrap.appendChild(intro);

    var st = gateState(codes, freqs, maxBits);
    var badSet = {};
    st.viols.forEach(function (p) { badSet[p[0]] = true; badSet[p[1]] = true; });

    var rows = document.createElement('div');
    rows.className = 'pg-rows';
    dests.forEach(function (d, idx) {
      rows.appendChild(rowEl(d.name, codes[idx], {
        sub: 'asked ' + d.freq + '×',
        cap: DEPTH,
        color: COLORS[idx % COLORS.length],
        bad: !!badSet[idx],
        onTap: function (bit) { codes[idx] += bit; api.sfx('select'); render(); },
        onBack: function () { codes[idx] = codes[idx].slice(0, -1); api.sfx('select'); render(); },
      }));
    });
    wrap.appendChild(rows);
    if (st.viols.length) wrap.appendChild(alertEl(st.viols, codes, names));

    /* burn-tree + the two gauges — vessel and tree update together. */
    wrap.appendChild(treePanel(DEPTH, codes, names, badSet));
    var gauges = document.createElement('div');
    gauges.className = 'pg-gauges';
    gauges.appendChild(vesselGauge(st.kraft));
    gauges.appendChild(avgGauge(st.avg, st.allFilled));
    wrap.appendChild(gauges);

    if (!taughtBefore && !currentHint) {
      wrap.appendChild(G.pz.coachCard('huff',
        'The vessel and the tree are the <b>same fact</b> twice: a whistle of ℓ bits pours ' +
        '2<sup>&minus;ℓ</sup> into the vessel and burns that same share of the tree.'));
    }
    if (currentHint) wrap.appendChild(G.pz.coachCard('huff', currentHint));

    var foot = document.createElement('div');
    foot.className = 'pg-foot';
    var checkBtn = document.createElement('button');
    checkBtn.className = 'btn btn-primary';
    checkBtn.textContent = 'Carve the signs';
    checkBtn.addEventListener('click', mainCarve);
    foot.appendChild(checkBtn);

    var status = document.createElement('div');
    status.className = 'pg-len';
    status.style.flex = '1';
    status.style.textAlign = 'right';
    status.textContent = st.ok ? 'looks valid — carve it!' :
      (!st.allFilled ? (countEmpty() + ' still blank') :
        (st.viols.length ? 'prefix clash' :
          (st.kraft > 1 + 1e-9 ? 'vessel overflows' : 'over budget')));
    status.style.color = st.ok ? 'var(--green)' : 'var(--dim)';
    foot.appendChild(status);
    wrap.appendChild(foot);

    root.appendChild(wrap);
    api.status('Kraft ' + fmt(st.kraft) + ' &middot; L&#772; ' +
      (st.allFilled ? fmt(st.avg) : '—') + ' / ' + fmt(maxBits));
  }

  function countEmpty() {
    return codes.filter(function (c) { return !c.length; }).length;
  }

  function mainCarve() {
    if (solved) return;
    var st = gateState(codes, freqs, maxBits);
    if (st.ok) {
      solved = true;
      ladder.reset();
      currentHint = null;
      G.pz.markTaught('prefix-gate');
      phase = 'debrief';
      api.sfx('spark');
      render();
    } else {
      var why = !st.allFilled ? (countEmpty() + ' whistle' + (countEmpty() === 1 ? '' : 's') + ' still blank.') :
        st.viols.length ? 'Two whistles clash — one begins the other.' :
        st.kraft > 1 + 1e-9 ? 'The vessel overflows.' :
        'Over the bit budget — busy roads need shorter whistles.';
      var h = ladder.fail();
      if (h) currentHint = h;
      api.fail('Not yet — ' + why);
      render();
    }
  }

  /* DEBRIEF — their numbers in the theorem (§6.6). */
  function renderDebrief() {
    var wrap = document.createElement('div');
    wrap.className = 'pg-wrap';
    var badSet = {};
    wrap.appendChild(treePanel(DEPTH, codes, names, badSet));
    var kraft = kraftSum(codes);
    var avg = weightedAvg(codes, freqs);
    var H = totalFreq > 0 ? G.pz.entropy(freqs.map(function (f) { return f / totalFreq; })) : 0;
    var flat = Math.ceil(Math.log(Math.max(2, dests.length)) / Math.LN2);
    wrap.appendChild(G.pz.debriefCard({
      tone: 'win',
      title: 'The signpost gate swings open.',
      html: 'All three rules hold: prefix-free, vessel at ' +
        '<span class="pzk-eq">&Sigma;2<sup>&minus;len</sup> = ' + G.pz.fmt(kraft) + ' &le; 1</span>, ' +
        'budget kept. Your average whistle costs <span class="pzk-eq">L&#772; = ' + G.pz.fmt(avg) +
        ' bits</span> against the floor <span class="pzk-eq">H = ' + G.pz.fmt(H) +
        ' bits</span> — the entropy of how often each road is asked for. ' +
        'Flat codes would pay &lceil;log&#8322;' + dests.length + '&rceil; = ' + flat +
        ' bits every single time.<br><b>Short codes for busy roads — that’s all compression is.</b>',
      buttonLabel: 'Carve the signs',
      onButton: function () { api.complete(); },
    }));
    root.appendChild(wrap);
    api.status('carved — L&#772; ' + G.pz.fmt(avg) + ' &le; ' + fmt(maxBits));
  }

  render();

  return {
    destroy: function () { root.innerHTML = ''; },
  };
}

G.puzzles.register('prefix-gate', {
  title: 'The Signpost Gate',
  create: create,
  /* pure logic, exposed for the scratch test only (PEDAGOGY.md §4.1) */
  _test: {
    isPrefix: isPrefix, prefixViolations: prefixViolations, kraftSum: kraftSum,
    weightedAvg: weightedAvg, huffmanLengths: huffmanLengths,
    canonicalCodes: canonicalCodes, treeDepthFor: treeDepthFor, gateState: gateState,
  },
});

})();
