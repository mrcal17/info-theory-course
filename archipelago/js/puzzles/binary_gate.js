/* THE QUIET ARCHIPELAGO — 'binary-gate' puzzle.
   The mail-sorting machine of Beacon Rock. A letter must reach ONE addressee
   among N candidates by asking yes/no questions. Each question shows the split
   it would make and the bits it earns (H2 of the split). The machine answers
   truthfully for the hidden target. Win = one candidate left, and it is target.

   Contract: js/core/overlay.js (create(root, config, api); api = {complete,
   fail, close, sfx, status, rng}). Config:
     { items:[{name, traits:{key:bool,...}},...],
       traitLabels:{key:'Question text?'},
       parQuestions:n, target?:index } */
(function () {
'use strict';

/* ------------------------------------------------------------------ */
/* pure logic (testable; mirrored in scratch test)                    */
/* ------------------------------------------------------------------ */

// binary entropy in bits
function h2(p) {
  if (p <= 0 || p >= 1) return 0;
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
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

// ceil(log2 n) — the number of perfect questions that suffice
function ceilLog2(n) {
  if (n <= 1) return 0;
  var k = 0, p = 1;
  while (p < n) { p *= 2; k++; }
  return k;
}

/* ------------------------------------------------------------------ */
/* one-time style                                                     */
/* ------------------------------------------------------------------ */

function injectStyle() {
  if (document.getElementById('bg-style')) return;
  var s = document.createElement('style');
  s.id = 'bg-style';
  s.textContent = [
    '.bg-wrap{display:flex;flex-direction:column;gap:0.8rem;}',
    '.bg-flavor{color:var(--muted);font-size:0.9rem;line-height:1.5;}',
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
    '.bg-readout{min-height:1.4rem;font-size:0.9rem;color:var(--muted);font-variant-numeric:tabular-nums;}',
    '.bg-readout b{color:var(--text);}',
    '.bg-ledger{font-size:0.85rem;color:var(--muted);max-height:150px;overflow-y:auto;}',
    '.bg-ledger .bg-le{display:flex;justify-content:space-between;gap:0.6rem;padding:0.2rem 0;',
    '  border-bottom:1px solid var(--surface2);}',
    '.bg-ledger .bg-le:last-child{border-bottom:none;}',
    '.bg-le .bg-leb{color:var(--cyan);font-variant-numeric:tabular-nums;}',
    '.bg-end{text-align:center;display:flex;flex-direction:column;gap:0.8rem;align-items:center;}',
    '.bg-end .bg-lesson{font-size:1rem;line-height:1.55;max-width:46ch;}',
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
  create: function (root, config, api) {
    injectStyle();

    var items = (config.items || []).map(function (it) {
      return { name: it.name, traits: it.traits || {} };
    });
    var labels = config.traitLabels || {};
    var par = config.parQuestions || 0;
    var N = items.length;
    var perfect = ceilLog2(N);

    // every trait key that has a label (the askable questions)
    var allKeys = Object.keys(labels);

    // hidden target: config.target index, else uniform via api.rng()
    function pickTarget() {
      if (typeof config.target === 'number' && items[config.target]) return config.target;
      return Math.min(N - 1, Math.floor(api.rng() * N));
    }

    var targetIdx, alive, asked, asksUsed, finished, ledger;

    function resetRound(announce) {
      targetIdx = pickTarget();
      alive = items.slice();           // candidates still possible
      asked = {};                      // key -> true once asked
      asksUsed = 0;
      finished = false;
      ledger = [];                     // {label, answer, bits} per asked question
      render();
      if (announce && G.ui && G.ui.toast) G.ui.toast('A fresh letter drops into the hopper.');
    }

    function pushStatus() {
      api.status('questions: ' + asksUsed + ' · candidates: ' + alive.length);
    }

    // ---- DOM scaffold ----
    var wrap = document.createElement('div');
    wrap.className = 'bg-wrap';
    root.appendChild(wrap);

    function render() {
      pushStatus();
      wrap.innerHTML = '';

      // intro / flavor
      var flav = document.createElement('div');
      flav.className = 'bg-flavor g-card';
      flav.innerHTML =
        'A letter waits in the hopper. Ask the machine yes/no questions until ' +
        'exactly one addressee remains. <span class="bg-muted">A perfect question ' +
        'halves the candidates &mdash; <b>⌈log₂' + N + '⌉ = ' + perfect +
        '</b> questions suffice.</span>';
      wrap.appendChild(flav);

      // candidate chips
      var chipWrap = document.createElement('div');
      chipWrap.className = 'g-card';
      var clab = document.createElement('div');
      clab.className = 'bg-sub';
      clab.textContent = 'Addressees';
      clab.style.marginBottom = '0.5rem';
      chipWrap.appendChild(clab);
      var chips = document.createElement('div');
      chips.className = 'bg-chips';
      var aliveNames = {};
      alive.forEach(function (it) { aliveNames[it.name] = true; });
      items.forEach(function (it) {
        var c = document.createElement('div');
        c.className = 'bg-chip' + (aliveNames[it.name] ? '' : ' bg-out');
        if (finished && alive.length === 1 && alive[0].name === it.name) c.className += ' bg-win';
        c.textContent = it.name;
        chips.appendChild(c);
      });
      chipWrap.appendChild(chips);
      wrap.appendChild(chipWrap);

      if (finished) { renderEnd(); return; }

      // live readout (updated on hover/focus of a question)
      var readout = document.createElement('div');
      readout.className = 'bg-readout';
      readout.innerHTML = '<span class="bg-muted">Hover a question to preview its split.</span>';
      wrap.appendChild(readout);

      // available questions
      var qcard = document.createElement('div');
      qcard.className = 'g-card';
      var qlab = document.createElement('div');
      qlab.className = 'bg-sub';
      qlab.textContent = 'Questions';
      qlab.style.marginBottom = '0.5rem';
      qcard.appendChild(qlab);

      var qlist = document.createElement('div');
      qlist.className = 'bg-qlist';
      var remaining = allKeys.filter(function (k) { return !asked[k]; });

      remaining.forEach(function (key) {
        var sc = splitCounts(alive, key);
        var bits = splitBits(sc.yes, sc.no);
        var b = document.createElement('button');
        b.className = 'bg-q';
        b.type = 'button';
        var txt = document.createElement('span');
        txt.className = 'bg-qtext';
        txt.textContent = labels[key];
        var bv = document.createElement('span');
        bv.className = 'bg-qbits';
        bv.textContent = '+' + fmtBits(bits) + ' bits';
        b.appendChild(txt);
        b.appendChild(bv);

        function preview() {
          readout.innerHTML =
            '<b>YES</b> keeps ' + sc.yes + ' · <b>NO</b> keeps ' + sc.no +
            ' &mdash; expected information: H₂(' +
            (sc.yes + sc.no ? (sc.yes / (sc.yes + sc.no)).toFixed(2) : '0') +
            ') = <b style="color:' + bitsColor(bits) + '">' + fmtBits(bits) + ' bits</b>';
        }
        b.addEventListener('mouseenter', preview);
        b.addEventListener('focus', preview);
        b.addEventListener('click', function () { askQuestion(key); });
        qlist.appendChild(b);
      });

      qcard.appendChild(qlist);
      wrap.appendChild(qcard);

      // guard against (theoretically impossible) softlock: out of questions, >1 left
      if (remaining.length === 0 && alive.length > 1) {
        var stuck = document.createElement('div');
        stuck.className = 'bg-flavor';
        stuck.innerHTML = 'No questions left and the letter is still ambiguous. ' +
          'The machine shrugs.';
        wrap.appendChild(stuck);
        var rb = document.createElement('button');
        rb.className = 'btn';
        rb.type = 'button';
        rb.textContent = 'Reset letter';
        rb.addEventListener('click', function () { resetRound(true); });
        wrap.appendChild(rb);
      }

      // ledger of asked questions
      if (asksUsed > 0) {
        var lcard = document.createElement('div');
        lcard.className = 'g-card';
        var llab = document.createElement('div');
        llab.className = 'bg-sub';
        llab.textContent = 'Ledger — ' + asksUsed + ' question' +
          (asksUsed === 1 ? '' : 's') + ' (par ' + par + ', perfect ' + perfect + ')';
        llab.style.marginBottom = '0.4rem';
        lcard.appendChild(llab);
        var led = document.createElement('div');
        led.className = 'bg-ledger';
        ledger.forEach(function (e) {
          var row = document.createElement('div');
          row.className = 'bg-le';
          var q = document.createElement('span');
          q.textContent = e.label + '  →  ' + (e.answer ? 'YES' : 'NO');
          var bb = document.createElement('span');
          bb.className = 'bg-leb';
          bb.textContent = '+' + fmtBits(e.bits) + ' bits';
          row.appendChild(q);
          row.appendChild(bb);
          led.appendChild(row);
        });
        lcard.appendChild(led);
        wrap.appendChild(lcard);
      }
    }

    function askQuestion(key) {
      if (finished || asked[key]) return;
      var sc = splitCounts(alive, key);
      var bits = splitBits(sc.yes, sc.no);
      var answer = !!(items[targetIdx].traits && items[targetIdx].traits[key]);
      asked[key] = true;
      asksUsed++;
      alive = eliminate(alive, key, answer);
      ledger.push({ label: labels[key], answer: answer, bits: bits });
      api.sfx(answer ? 'select' : 'choice');

      if (alive.length === 1) {
        finished = true;
      }
      render();
    }

    function renderEnd() {
      var end = document.createElement('div');
      end.className = 'bg-end g-card';

      var who = alive[0] ? alive[0].name : '?';
      var vsPar = asksUsed <= par
        ? 'at or under par (' + par + ').'
        : (asksUsed - par) + ' over par (' + par + ').';
      var vsPerfect = asksUsed === perfect
        ? 'exactly ⌈log₂' + N + '⌉ — perfectly halved every time.'
        : 'a perfect run is ' + perfect + ' (⌈log₂' + N + '⌉).';

      var lesson = document.createElement('div');
      lesson.className = 'bg-lesson';
      lesson.innerHTML = 'Sorted to <b style="color:var(--green)">' + G.util.esc(who) +
        '</b> in <b>' + asksUsed + '</b> question' + (asksUsed === 1 ? '' : 's') +
        ' — ' + vsPar + '<br><span class="bg-muted">Each yes/no answer is at ' +
        'most one bit; ' + vsPerfect + '</span>';
      end.appendChild(lesson);

      var btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.type = 'button';
      btn.textContent = 'Open the gate';
      btn.addEventListener('click', function () { api.complete(); });
      end.appendChild(btn);

      wrap.appendChild(end);
      api.sfx('door');
    }

    // boot
    if (N === 0) {
      wrap.innerHTML = '<p class="bg-flavor">The hopper is empty.</p>';
      pushStatus();
    } else {
      resetRound(false);
    }

    return {
      destroy: function () { /* element listeners die with the DOM; no timers */ }
    };
  }
});

})();
