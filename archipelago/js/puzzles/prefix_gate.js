/* THE QUIET ARCHIPELAGO — prefix-gate ('prefix-gate')
   The signpost gate of Huffman Wood. Assign each destination a whistle-code of
   ● (dot = 0) and ○ (circle = 1). Three rules, all checked live:
     1. prefix-free — no codeword may start another (a traveler can't tell where
        the message ends otherwise);
     2. the Kraft vessel Σ2^(−lenᵢ) — never overflows past 1.0;
     3. the weighted average length Σ(freqᵢ·lenᵢ)/Σfreqᵢ ≤ maxBits.
   Short codes for busy roads — that's all compression is.

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

/* Optimal code-length MULTISET (sorted) for given freqs via Huffman depths.
   Used only by the hint — reveals lengths, never the bit assignment. */
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

/* --------------------------------- UI --------------------------------- */

var MAX_LEN = 5;
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
  '.pg-code{display:flex;gap:.18rem;align-items:center;min-width:120px;min-height:32px;' +
    'font-size:1.2rem;letter-spacing:.05em;flex-wrap:wrap}' +
  '.pg-sym{color:var(--blue)}' +
  '.pg-sym.pg-one{color:var(--purple)}' +
  '.pg-row.pg-bad .pg-sym{color:var(--red)}' +
  '.pg-empty{color:var(--dim);font-size:.78rem;font-style:italic}' +
  '.pg-len{font-size:.7rem;color:var(--dim);min-width:34px}' +
  '.pg-btns{display:flex;gap:.3rem}' +
  '.pg-mini{min-width:42px;min-height:42px;border-radius:8px;border:2px solid var(--surface2);' +
    'background:var(--bg);color:var(--text);font-size:1.05rem;cursor:pointer;padding:0}' +
  '.pg-mini:hover:not(:disabled){border-color:var(--blue);color:var(--blue)}' +
  '.pg-mini:disabled{opacity:.35;cursor:default}' +
  '.pg-mini.pg-zero{color:var(--blue)}.pg-mini.pg-one{color:var(--purple)}' +
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
  '.pg-hintbox{font-size:.84rem;color:var(--yellow);background:rgba(251,191,36,.08);' +
    'border:1px solid rgba(251,191,36,.35);border-radius:8px;padding:.5rem .65rem;line-height:1.45}' +
  '.pg-win{background:var(--surface);border:1px solid var(--green);border-radius:12px;padding:1rem;' +
    'display:flex;flex-direction:column;gap:.6rem}' +
  '.pg-win h3{font-size:1rem;color:var(--text)}.pg-win p{font-size:.88rem;color:var(--muted);line-height:1.5}';
  var el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = css;
  document.head.appendChild(el);
}

function create(root, config, api) {
  injectStyle();

  var dests = (config.dests || []).map(function (d, i) {
    return { id: i, name: String(d.name), freq: d.freq | 0 };
  });
  var maxBits = +config.maxBits;
  var freqs = dests.map(function (d) { return d.freq; });

  var codes = dests.map(function () { return ''; });   // each: string of '0'/'1'
  var failedChecks = 0;
  var hintShown = false;
  var solved = false;

  function checkBtnClicked() {
    var v = prefixViolations(codes);
    var allFilled = codes.every(function (c) { return c.length > 0; });
    var avg = weightedAvg(codes, freqs);
    var ok = allFilled && v.length === 0 && avg <= maxBits + 1e-9;
    if (ok) {
      solved = true;
      render();
    } else {
      failedChecks++;
      api.fail('Not yet — the gate stays shut.');
      render();
    }
  }

  function append(idx, bit) {
    if (codes[idx].length >= MAX_LEN) return;
    codes[idx] += bit;
    api.sfx('select');
    render();
  }
  function backspace(idx) {
    if (!codes[idx].length) return;
    codes[idx] = codes[idx].slice(0, -1);
    api.sfx('select');
    render();
  }

  function symHtml(code, bad) {
    if (!code) return '<span class="pg-empty">(no whistle yet)</span>';
    var out = '';
    for (var i = 0; i < code.length; i++) {
      out += code[i] === '0'
        ? '<span class="pg-sym">&#9679;</span>'   // ● dot
        : '<span class="pg-sym pg-one">&#9711;</span>'; // ○ circle
    }
    return out;
  }

  function render() {
    root.innerHTML = '';
    if (solved) { root.appendChild(winCard()); api.status('signs carved — avg ' +
      fmt(weightedAvg(codes, freqs)) + ' ≤ ' + maxBits); return; }

    var wrap = document.createElement('div');
    wrap.className = 'pg-wrap';

    var intro = document.createElement('div');
    intro.className = 'pg-intro';
    intro.innerHTML = 'Give each destination a whistle-code: <b>&#9679;</b> = 0 (dot), ' +
      '<b>&#9711;</b> = 1 (circle). Busy roads deserve short codes. Keep it ' +
      '<b>prefix-free</b>, under the Kraft line, and within the bit budget.';
    wrap.appendChild(intro);

    var viols = prefixViolations(codes);
    var badSet = {};
    viols.forEach(function (p) { badSet[p[0]] = true; badSet[p[1]] = true; });

    // rows
    var rows = document.createElement('div');
    rows.className = 'pg-rows';
    dests.forEach(function (d, idx) {
      var row = document.createElement('div');
      row.className = 'pg-row' + (badSet[idx] ? ' pg-bad' : '');

      var dest = document.createElement('div');
      dest.className = 'pg-dest';
      dest.innerHTML = '<div class="pg-name">' + G.util.esc(d.name) + '</div>' +
        '<div class="pg-freq">asked ' + d.freq + '&times;</div>';
      row.appendChild(dest);

      var codeEl = document.createElement('div');
      codeEl.className = 'pg-code';
      codeEl.innerHTML = symHtml(codes[idx]);
      row.appendChild(codeEl);

      var lenEl = document.createElement('div');
      lenEl.className = 'pg-len';
      lenEl.textContent = codes[idx].length + ' bit' + (codes[idx].length === 1 ? '' : 's');
      row.appendChild(lenEl);

      var btns = document.createElement('div');
      btns.className = 'pg-btns';
      btns.appendChild(miniBtn('&#9679;', 'pg-zero', codes[idx].length >= MAX_LEN,
        function () { append(idx, '0'); }, 'append dot (0)'));
      btns.appendChild(miniBtn('&#9711;', 'pg-one', codes[idx].length >= MAX_LEN,
        function () { append(idx, '1'); }, 'append circle (1)'));
      btns.appendChild(miniBtn('&larr;', '', codes[idx].length === 0,
        function () { backspace(idx); }, 'backspace'));
      row.appendChild(btns);

      rows.appendChild(row);
    });
    wrap.appendChild(rows);

    // prefix alert
    if (viols.length) {
      var pair = viols[0];
      var alert = document.createElement('div');
      alert.className = 'pg-alert';
      var a = codes[pair[0]], b = codes[pair[1]];
      var shorter = a.length <= b.length ? a : b;
      alert.innerHTML = 'A traveler hearing <b>' + symHtml(shorter) + '</b> couldn&rsquo;t tell if the ' +
        'message ended — <b>prefix-free</b> means no codeword starts another. ' +
        G.util.esc(dests[pair[0]].name) + ' and ' + G.util.esc(dests[pair[1]].name) + ' clash' +
        (viols.length > 1 ? ' (+' + (viols.length - 1) + ' more)' : '') + '.';
      wrap.appendChild(alert);
    }

    // gauges
    var kraft = kraftSum(codes);
    var avg = weightedAvg(codes, freqs);
    var allFilled = codes.every(function (c) { return c.length > 0; });

    var gauges = document.createElement('div');
    gauges.className = 'pg-gauges';

    // Kraft vessel
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
    gauges.appendChild(kg);

    // weighted avg meter
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
    gauges.appendChild(ag);

    wrap.appendChild(gauges);

    // hint box (after >=2 failed checks; reveals length multiset only)
    if (hintShown) {
      var hb = document.createElement('div');
      hb.className = 'pg-hintbox';
      var lens = huffmanLengths(freqs);
      hb.innerHTML = 'Huff&rsquo;s margin note: an optimal plan uses code <b>lengths</b> {' +
        lens.join(', ') + '} (in some order). Shortest codes go to the busiest roads. ' +
        '(That&rsquo;s the length multiset, not the bits — those are yours to choose.)';
      wrap.appendChild(hb);
    }

    // footer
    var foot = document.createElement('div');
    foot.className = 'pg-foot';

    var checkBtn = document.createElement('button');
    checkBtn.className = 'btn btn-primary';
    checkBtn.textContent = 'Carve the signs';
    checkBtn.addEventListener('click', checkBtnClicked);
    foot.appendChild(checkBtn);

    if (failedChecks >= 2 && !hintShown) {
      var hintBtn = document.createElement('button');
      hintBtn.className = 'btn';
      hintBtn.textContent = 'Hint';
      hintBtn.addEventListener('click', function () { hintShown = true; api.sfx('select'); render(); });
      foot.appendChild(hintBtn);
    }

    var status = document.createElement('div');
    status.className = 'pg-len';
    status.style.flex = '1';
    status.style.textAlign = 'right';
    var ready = allFilled && viols.length === 0 && avg <= maxBits + 1e-9;
    status.textContent = ready ? 'looks valid — carve it!' :
      (!allFilled ? (countEmpty() + ' still blank') :
        (viols.length ? 'prefix clash' : 'over budget'));
    status.style.color = ready ? 'var(--green)' : 'var(--dim)';
    foot.appendChild(status);

    wrap.appendChild(foot);

    root.appendChild(wrap);
    api.status('Kraft ' + fmt(kraft) + ' · L&#772; ' + (allFilled ? fmt(avg) : '—') +
      ' / ' + fmt(maxBits));
  }

  function countEmpty() {
    return codes.filter(function (c) { return !c.length; }).length;
  }

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

  function winCard() {
    var avg = weightedAvg(codes, freqs);
    var box = document.createElement('div');
    box.className = 'pg-win';
    box.innerHTML =
      '<h3>The signpost gate swings open.</h3>' +
      '<p>Every code is nonempty, prefix-free (Kraft ' + fmt(kraftSum(codes)) + ' &le; 1), ' +
        'and the weighted average is <b>' + fmt(avg) + '</b> &le; ' + fmt(maxBits) + ' bits.</p>' +
      '<p>Short codes for busy roads — <b>that&rsquo;s all compression is.</b> The Kraft inequality ' +
        'is exactly the budget that makes a prefix-free code possible.</p>';
    var btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = 'Carve the signs';
    btn.style.alignSelf = 'flex-start';
    btn.addEventListener('click', function () { api.complete(); });
    box.appendChild(btn);
    return box;
  }

  function fmt(x) {
    if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
    return (Math.round(x * 100) / 100).toFixed(2).replace(/0$/, '');
  }

  render();

  return {
    destroy: function () { root.innerHTML = ''; }
  };
}

G.puzzles.register('prefix-gate', {
  title: 'The Signpost Gate',
  create: create
});

})();
