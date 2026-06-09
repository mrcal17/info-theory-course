/* SIGNAL LOST — 07 · Be the Model (be-the-model)
   Shannon's guessing game: the player IS the language model and is scored in
   bits — their personal cross-entropy on the next character. Contract: ../DESIGN.md. */
(function () {
'use strict';

/* ---------------- pure math (no DOM, unit-testable) ---------------- */

function log2(x) { return Math.log(x) / Math.LN2; }

function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

// Codeword length for a character guessed correctly on attempt g (1-indexed):
//   bits(g) = 1 + log2(g)   ->  g=1 -> 1.0, g=2 -> 2.0, g=4 -> 3.0, g=8 -> 4.0.
// This is the length we'd assign if we built a code over the player's guess order.
function bitsForAttempt(g) { return 1 + log2(g); }

// Total alphabet size (a–z + space). Hard cap / monkey baseline derive from this.
var ALPHABET_SIZE = 27;

// Auto-reveal cap: after MAX_WRONG wrong guesses we stop and charge the worst
// codeword length, 1 + log2(27) ≈ 5.75 bits.
var MAX_WRONG = 13;
var CAP_BITS = bitsForAttempt(ALPHABET_SIZE); // 1 + log2(27)

// Baselines for the comparison chart (bits per character).
var MONKEY_BITS = log2(ALPHABET_SIZE); // coin-flipping monkey ≈ 4.75
var GZIP_BITS = 2.6;
var LLM_BITS = 0.8;

// Cost colour bucket: green ≤ 1.5, yellow ≤ 3, red above.
function costClass(b) { return b <= 1.5 ? 'bm-c-green' : (b <= 3 ? 'bm-c-yellow' : 'bm-c-red'); }

// Average bits/char over a list of per-character costs.
function average(costs) {
  if (!costs.length) return 0;
  var s = 0;
  for (var i = 0; i < costs.length; i++) s += costs[i];
  return s / costs.length;
}

// Perplexity = 2^(avg bits/char): the effective number of equally-likely choices.
function perplexity(avg) { return Math.pow(2, avg); }

// Validator: a passage must be strictly lowercase a–z and spaces, non-empty.
function isValidPassage(s) { return typeof s === 'string' && /^[a-z ]+$/.test(s); }

// Star thresholds: avg ≤ 1.9 -> 3, ≤ 2.7 -> 2, finished -> 1.
function starsForAvg(avg) { return avg <= 1.9 ? 3 : (avg <= 2.7 ? 2 : 1); }

// Bits currency: better than the monkey earns more, clamped to 5..50.
function bitsScore(avg) {
  return clamp(Math.round(50 * (MONKEY_BITS - avg) / (MONKEY_BITS - 1.0)), 5, 50);
}

function round2(x) { return Math.round(x * 100) / 100; }
function round1(x) { return Math.round(x * 10) / 10; }

/* ---------------- content ----------------
   Two short recovered-transmission fragments, lowercase a–z + space only,
   built from common, predictable English words. The first chars are free
   context. Validated at create() time by isValidPassage(). */

var PASSAGES = [
  {
    text: 'we lost the signal but the message is still in the noise',
    free: 9, // "we lost t" — enough to set the scene
  },
  {
    text: 'if you can read this then the old code still works for us',
    free: 9, // "if you ca"
  },
];

// On-screen key order: a–z then space (rendered as ␣).
function keyList() {
  var keys = [];
  for (var c = 97; c <= 122; c++) keys.push(String.fromCharCode(c));
  keys.push(' ');
  return keys;
}

/* ---------------- DOM helper ---------------- */

function mk(tag, cls, html) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

function keyLabel(ch) { return ch === ' ' ? '␣' : ch; }

/* ---------------- registration ---------------- */

Game.register({
  id: 'be-the-model',
  title: 'Be the Model',
  icon: '🤖',
  part: 6,
  module: '6F',
  moduleTitle: 'Information Theory in Modern LLMs',
  moduleUrl: '../6f_it_llms/',
  tagline: 'Predict the next character and pay in bits — you are the language model now.',

  briefing:
    '<p>The decoder array is gone. A fragment of an old transmission is bleeding ' +
    'through the static, one character at a time, and there is no machine left to ' +
    'finish it. So you will. Guess the next letter; the relay charges you in bits ' +
    'for every miss. Predict well and the message comes cheap.</p>' +
    '<ul>' +
    '<li>The revealed text glows; the next character is hidden. Guess it.</li>' +
    '<li><b>Type a letter</b> on your keyboard, or tap the on-screen keys ' +
    '(<b>a</b>–<b>z</b> and <b>␣</b> for space).</li>' +
    '<li>Wrong guesses gray out and add up. A first-try hit costs <b>1.0 bit</b>; ' +
    'each later try costs more — <b>bits = 1 + log₂(attempt)</b>.</li>' +
    '<li>Each revealed character is coloured by its cost, so the passage becomes a ' +
    'heatmap of your predictive skill. Two short fragments; lower average wins.</li>' +
    '</ul>',

  concept:
    '<p>A language model is trained to minimise <b>cross-entropy</b>: the average ' +
    'number of bits its probability estimates assign to the true next token. ' +
    'You were just scored the exact same way — your average bits per character ' +
    '<em>is</em> your cross-entropy on this text, and ' +
    '<b>perplexity = 2<sup>avg</sup></b> is how many equally-likely choices that ' +
    'feels like.</p>' +
    '<p>English carries only about <b>1 bit per character</b> of true entropy, ' +
    'far below the 4.75 bits a uniform-random typist would need. That gap is ' +
    'pure redundancy — predictability — and any next-character predictor paired ' +
    'with an arithmetic coder turns it into compression. ' +
    '<b>Better prediction = smaller files.</b> The model and the compressor are ' +
    'the same machine.</p>',

  create: function (root, api) {
    /* ---- all mutable state lives here; create() is the full reset ---- */
    var rng = api.rng;
    var KEYS = keyList();

    // Drop any malformed passages defensively (the validator is the contract).
    var passages = PASSAGES.filter(function (p) { return isValidPassage(p.text); });

    var passageIdx = 0;
    var pos = 0;                 // index of the character currently being guessed
    var wrong = {};             // ch -> true for keys greyed out this character
    var attempt = 0;            // wrong guesses so far on the current character
    var locked = false;         // input lock during the brief reveal beat
    var finished = false;
    var completed = false;      // guards a single api.complete

    var costs = [];             // per-character bit cost, current passage
    var allCosts = [];          // per-character bit cost across finished passages
    var rawSizes = [];          // raw char count per finished passage (excl. free)

    var timers = [];
    function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    api.injectStyle(
      '.bm-wrap{display:flex;flex-direction:column;gap:1rem;}' +
      '.bm-head{display:flex;justify-content:space-between;align-items:baseline;gap:0.6rem;flex-wrap:wrap;}' +
      '.bm-pname{font-weight:600;font-size:1rem;}' +
      '.bm-pnum{font-size:0.72rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);}' +
      '.bm-passage{background:var(--bg);border:1px solid var(--surface2);border-radius:10px;' +
        'padding:0.9rem 1rem;font-family:ui-monospace,Consolas,monospace;font-size:1.25rem;' +
        'line-height:1.7;letter-spacing:0.02em;word-break:break-word;min-height:3.4rem;}' +
      '.bm-ch{white-space:pre;}' +
      '.bm-free{color:var(--muted);}' +
      '.bm-c-green{color:var(--green);}' +
      '.bm-c-yellow{color:var(--yellow);}' +
      '.bm-c-red{color:var(--red);}' +
      '.bm-cursor{color:var(--bg);background:var(--blue);border-radius:3px;padding:0 0.12em;' +
        'animation:bm-blink 1s steps(1) infinite;}' +
      '@keyframes bm-blink{0%,60%{opacity:1;}61%,100%{opacity:0.35;}}' +
      '.bm-pending{color:var(--dim);}' +
      '.bm-readout{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.6rem;}' +
      '.bm-stat{background:var(--surface);border:1px solid var(--surface2);border-radius:10px;padding:0.7rem 0.8rem;}' +
      '.bm-stat .bm-k{font-size:0.68rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--dim);}' +
      '.bm-stat .bm-v{font-size:1.35rem;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.3;}' +
      '.bm-stat .bm-sub{font-size:0.7rem;color:var(--muted);}' +
      '.bm-msg{font-size:0.85rem;color:var(--muted);min-height:1.2em;}' +
      '.bm-msg b.bm-hit{color:var(--green);}' +
      '.bm-msg b.bm-miss{color:var(--red);}' +
      '.bm-keys{display:grid;grid-template-columns:repeat(9,1fr);gap:0.4rem;}' +
      '.bm-key{min-height:44px;min-width:40px;border:2px solid var(--surface2);border-radius:8px;' +
        'background:var(--surface);color:var(--text);font-family:ui-monospace,Consolas,monospace;' +
        'font-size:1.05rem;cursor:pointer;transition:transform 0.1s,border-color 0.1s,opacity 0.15s;' +
        'display:flex;align-items:center;justify-content:center;padding:0;}' +
      '.bm-key:hover:not(:disabled){transform:translateY(-2px);border-color:var(--blue);}' +
      '.bm-key.bm-space{grid-column:1 / -1;}' +
      '.bm-key.bm-dead{opacity:0.3;filter:grayscale(1);cursor:default;border-style:dashed;}' +
      '.bm-key.bm-flash{border-color:var(--green);box-shadow:0 0 14px rgba(52,211,153,0.55);}' +
      '/* debrief comparison chart */' +
      '.bm-chart{display:flex;flex-direction:column;gap:0.5rem;margin:0.4rem 0 0.2rem;}' +
      '.bm-crow{display:grid;grid-template-columns:130px 1fr 64px;gap:0.5rem;align-items:center;font-size:0.82rem;}' +
      '.bm-clabel{color:var(--muted);}' +
      '.bm-clabel.bm-you{color:var(--text);font-weight:700;}' +
      '.bm-ctrack{height:14px;background:var(--surface2);border-radius:7px;overflow:hidden;}' +
      '.bm-cfill{height:100%;border-radius:7px;}' +
      '.bm-cval{text-align:right;font-variant-numeric:tabular-nums;color:var(--muted);}' +
      '@media (max-width:420px){.bm-passage{font-size:1.1rem;}.bm-key{font-size:0.95rem;}' +
        '.bm-crow{grid-template-columns:96px 1fr 52px;font-size:0.76rem;}}'
    );

    /* ---- DOM scaffold ---- */
    var wrap = mk('div', 'bm-wrap');

    var head = mk('div', 'bm-head');
    var pname = mk('div', 'bm-pname', 'Recovered fragment');
    var pnum = mk('div', 'bm-pnum');
    head.appendChild(pname);
    head.appendChild(pnum);
    wrap.appendChild(head);

    var passageBox = mk('div', 'bm-passage');
    wrap.appendChild(passageBox);

    var readout = mk('div', 'bm-readout');
    var stAvg = makeStat('your bits / char', 'cross-entropy so far');
    var stPx = makeStat('your perplexity', '2^avg effective choices');
    var stThis = makeStat('this character', 'cost of the current guess');
    readout.appendChild(stAvg.box);
    readout.appendChild(stPx.box);
    readout.appendChild(stThis.box);
    wrap.appendChild(readout);

    var msg = mk('div', 'bm-msg', '');
    wrap.appendChild(msg);

    var keysWrap = mk('div', 'bm-keys');
    wrap.appendChild(keysWrap);

    root.replaceChildren(wrap);

    // map ch -> its key button, built once (keys never change identity)
    var keyBtns = {};
    KEYS.forEach(function (ch) {
      var btn = mk('button', 'bm-key' + (ch === ' ' ? ' bm-space' : ''), keyLabel(ch));
      btn.setAttribute('aria-label', ch === ' ' ? 'space' : ch);
      btn.addEventListener('click', function () { guess(ch); });
      keyBtns[ch] = btn;
      keysWrap.appendChild(btn);
    });

    function makeStat(k, sub) {
      var box = mk('div', 'bm-stat');
      box.appendChild(mk('div', 'bm-k', k));
      var v = mk('div', 'bm-v', '—');
      box.appendChild(v);
      var s = mk('div', 'bm-sub', sub);
      box.appendChild(s);
      return { box: box, v: v, sub: s };
    }

    /* ---- rendering ---- */

    // Render the passage: free prefix muted, scored chars coloured by cost,
    // the active position as a blinking cursor, and the rest as faint dots.
    function renderPassage() {
      var p = passages[passageIdx];
      var text = p.text;
      passageBox.replaceChildren();
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        var label = ch === ' ' ? ' ' : ch; // nbsp so spaces stay visible
        var span;
        if (i < p.free) {
          span = mk('span', 'bm-ch bm-free', label);
        } else if (i < pos) {
          span = mk('span', 'bm-ch ' + costClass(costs[i - p.free]), label);
        } else if (i === pos && !finished) {
          // current target hidden behind a cursor block
          span = mk('span', 'bm-ch bm-cursor', ' ');
        } else {
          span = mk('span', 'bm-ch bm-pending', '·'); // middle dot placeholder
        }
        passageBox.appendChild(span);
      }
    }

    function refreshKeys() {
      KEYS.forEach(function (ch) {
        var btn = keyBtns[ch];
        var dead = !!wrong[ch];
        btn.disabled = dead || locked || finished;
        btn.classList.toggle('bm-dead', dead);
      });
    }

    function liveAvg() {
      // average over every scored character across all passages so far + this one
      var combined = allCosts.concat(costs);
      return average(combined);
    }

    function updateReadout() {
      var avg = liveAvg();
      var scored = allCosts.length + costs.length;
      if (scored === 0) {
        stAvg.v.textContent = '—';
        stPx.v.textContent = '—';
      } else {
        stAvg.v.textContent = round2(avg) + ' bits';
        stAvg.v.style.color = costClass(avg) === 'bm-c-green' ? 'var(--green)'
          : (costClass(avg) === 'bm-c-yellow' ? 'var(--yellow)' : 'var(--red)');
        stPx.v.textContent = '≈ ' + round1(perplexity(avg));
        stPx.sub.textContent = round1(perplexity(avg)) + ' chars of effective choice';
      }
      // current-character running cost (what the NEXT correct guess would cost)
      var nextG = attempt + 1;
      var capped = nextG > ALPHABET_SIZE;
      var cur = capped ? CAP_BITS : bitsForAttempt(nextG);
      stThis.v.textContent = round2(cur) + ' bits';
      stThis.v.style.color = costClass(cur) === 'bm-c-green' ? 'var(--green)'
        : (costClass(cur) === 'bm-c-yellow' ? 'var(--yellow)' : 'var(--red)');
      stThis.sub.textContent = attempt === 0 ? 'a correct first guess'
        : (attempt + ' wrong so far');
    }

    function setMsg(html) { msg.innerHTML = html; }

    function pushStatus() {
      api.status('Passage ' + Math.min(passageIdx + 1, passages.length) + '/' + passages.length +
        ' &middot; ' + (liveAvg() ? round2(liveAvg()) + ' bits/char' : '—'));
    }

    /* ---- passage flow ---- */

    function loadPassage() {
      var p = passages[passageIdx];
      pos = p.free;             // first free chars are revealed context
      wrong = {};
      attempt = 0;
      locked = false;
      costs = [];
      pname.textContent = 'Recovered fragment';
      pnum.textContent = 'Passage ' + (passageIdx + 1) + ' / ' + passages.length;
      renderPassage();
      refreshKeys();
      updateReadout();
      setMsg('The first few characters survived intact. Predict what comes next.');
      pushStatus();
    }

    // Record the cost for the just-solved character and advance.
    function settleCharacter(cost) {
      var p = passages[passageIdx];
      costs.push(cost);
      pos++;
      attempt = 0;
      wrong = {};
      renderPassage();
      refreshKeys();
      updateReadout();
      pushStatus();

      if (pos >= p.text.length) {
        // passage complete
        rawSizes.push(p.text.length - p.free);
        allCosts = allCosts.concat(costs);
        locked = true;
        setMsg('Fragment recovered. Average so far: <b>' + round2(liveAvg()) + '</b> bits/char.');
        later(function () {
          passageIdx++;
          if (passageIdx >= passages.length) {
            finishGame();
          } else {
            loadPassage();
          }
        }, 1100);
      }
    }

    function guess(ch) {
      if (locked || finished) return;
      if (wrong[ch]) return; // already eliminated
      var p = passages[passageIdx];
      var target = p.text.charAt(pos);

      if (ch === target) {
        var cost = bitsForAttempt(attempt + 1); // attempt+1 = the winning try
        api.sfx('good');
        flashKey(ch);
        setMsg('<b class="bm-hit">' + keyLabel(ch) + '</b> — right on try ' +
          (attempt + 1) + ', ' + round2(cost) + ' bits.');
        settleCharacter(cost);
        return;
      }

      // wrong guess
      wrong[ch] = true;
      attempt++;
      api.sfx('bad');
      refreshKeys();
      updateReadout();

      if (attempt >= MAX_WRONG) {
        // hard cap: auto-reveal at the worst codeword length
        api.sfx('bad');
        setMsg('No luck in ' + MAX_WRONG + ' tries — revealed <b>' +
          keyLabel(target) + '</b> at the cap, ' + round2(CAP_BITS) + ' bits.');
        settleCharacter(CAP_BITS);
      } else {
        setMsg('<b class="bm-miss">' + keyLabel(ch) + '</b> — not it. ' +
          (attempt) + ' wrong; next correct guess now costs ' +
          round2(bitsForAttempt(attempt + 1)) + ' bits.');
      }
    }

    function flashKey(ch) {
      var btn = keyBtns[ch];
      if (!btn) return;
      btn.classList.add('bm-flash');
      later(function () { btn.classList.remove('bm-flash'); }, 220);
    }

    /* ---- physical keyboard ---- */

    function onKey(e) {
      if (locked || finished) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return; // ignore modified keys
      var k = e.key;
      var ch = null;
      if (k === ' ' || k === 'Spacebar') ch = ' ';
      else if (k && k.length === 1 && k >= 'a' && k <= 'z') ch = k;
      else if (k && k.length === 1 && k >= 'A' && k <= 'Z') ch = k.toLowerCase();
      if (ch == null) return;
      e.preventDefault();
      guess(ch);
    }
    document.addEventListener('keydown', onKey);

    /* ---- finish & debrief ---- */

    function comparisonChart(youAvg) {
      // Horizontal DOM bars, scaled to the monkey baseline (the widest).
      var rows = [
        { label: 'YOU', val: youAvg, color: 'var(--blue)', you: true, txt: round2(youAvg) },
        { label: 'random monkey', val: MONKEY_BITS, color: 'var(--red)', txt: round2(MONKEY_BITS) },
        { label: 'gzip', val: GZIP_BITS, color: 'var(--orange)', txt: round1(GZIP_BITS) },
        { label: 'strong LLM', val: LLM_BITS, color: 'var(--green)', txt: round1(LLM_BITS) },
        { label: 'Shannon 1951', val: 0.95, color: 'var(--purple)', txt: '0.6–1.3', range: true },
      ];
      var max = MONKEY_BITS;
      var html = '<div class="bm-chart">';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var w = clamp(r.val / max, 0, 1) * 100;
        html += '<div class="bm-crow">' +
          '<span class="bm-clabel' + (r.you ? ' bm-you' : '') + '">' + r.label + '</span>' +
          '<span class="bm-ctrack"><span class="bm-cfill" style="width:' + w.toFixed(1) +
            '%;background:' + r.color + ';"></span></span>' +
          '<span class="bm-cval">' + r.txt + '</span>' +
          '</div>';
      }
      html += '</div>';
      return html;
    }

    function finishGame() {
      if (completed) return;
      finished = true;

      var avg = average(allCosts);
      var stars = starsForAvg(avg);
      var bits = bitsScore(avg);

      var totalChars = 0;
      for (var i = 0; i < rawSizes.length; i++) totalChars += rawSizes[i];

      var yourSize = 0; // total bits your predictions spent
      for (var j = 0; j < allCosts.length; j++) yourSize += allCosts[j];
      var rawSize = totalChars * MONKEY_BITS; // size at the uniform 4.75 bits/char
      var savedPct = rawSize > 0 ? (1 - yourSize / rawSize) * 100 : 0;

      var px = perplexity(avg);

      var detail =
        '<p>You predicted <b>' + totalChars + '</b> characters at ' +
        '<b>' + round2(avg) + ' bits/char</b> — your cross-entropy on the fragments. ' +
        'That is a perplexity of <b>≈ ' + round1(px) + '</b>: each character felt like a ' +
        'choice among about ' + round1(px) + ' equally-likely options.</p>' +
        comparisonChart(avg) +
        '<p>Your predictions would compress these passages to ' +
        '<b>' + Math.round(yourSize) + ' bits</b>, versus <b>' + Math.round(rawSize) +
        ' bits</b> for a random typist at ' + round2(MONKEY_BITS) + ' bits/char — ' +
        'a <b>' + Math.max(0, Math.round(savedPct)) + '%</b> saving, squeezed out of the ' +
        'redundancy of English.</p>' +
        '<p>That is the whole trick behind a language model: every bit it shaves off ' +
        'the next-token cost is a bit shaved off the file. Prediction <em>is</em> ' +
        'compression.</p>';

      var headline = stars === 3 ? 'Fluent predictor'
        : (stars === 2 ? 'Reading the static' : 'Fragment recovered');

      pushStatus();
      completed = true;
      api.complete({
        stars: stars,
        bits: bits,
        headline: headline,
        detailHTML: detail,
      });
    }

    // first passage. If (defensively) no valid passages exist, complete safely.
    if (!passages.length) {
      finished = true;
      completed = true;
      api.complete({
        stars: 1,
        bits: 5,
        headline: 'No fragments to recover',
        detailHTML: '<p>No valid passage data — but the wiring held.</p>',
      });
    } else {
      loadPassage();
    }

    return {
      destroy: function () {
        clearTimers();
        document.removeEventListener('keydown', onKey);
      },
    };
  },
});

})();
