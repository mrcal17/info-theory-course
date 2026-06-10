/* THE QUIET ARCHIPELAGO — 'forecast' puzzle (The Dune of Surprises). DEEP
   REWORK per PEDAGOGY.md §6.3. Teaching loop:
     HOOK    — price a 1-in-2 vs a 1-in-16 eruption in bits (predict first).
     GUIDE   — round 1/3: eruptions fire on an internal dyadic teach field;
               the player PRICES each in bits before it banks (formula card
               shows the halving chain for any tapped odds). Gate: 4 of 6.
     STRIP   — round 2/3: assemble the field's average surprise term by term
               (one p·(−log₂p) tile per vent into a sum tray), commit, then
               watch ~40 sampled blows converge onto it. Gate: every vent
               exactly once.
     MASTERY — round 3/3: the ISLAND CONFIG field (vents/goalBits/rounds).
               Expected-value labels are GONE — only p shows. Camp the
               collector; bank −log₂p on hits; fill the jar in the budget.
               Camping the rarest vent reliably misses (verified in the
               scratch test against both dune configs).
     DEBRIEF — average surprise IS entropy, with the player's assembled H
               and the empirical 40-blow average side by side.
   Repeat encounters: G.pz.taught('forecast') skips hook+guide+strip (both
   dune doors use this type; the second must not re-teach). markTaught fires
   on first mastery win. Hint ladders per PEDAGOGY §1.7.
   Pure logic lives in LOGIC (also exported as def.logic) and is exercised by
   _smoke/pz_test_forecast.mjs; the Chrome drive is _smoke/pz_drive_forecast.mjs.
   Contract: ../../DESIGN.md + ../../PEDAGOGY.md · host: ../core/overlay.js
   (api = complete, fail, close, sfx, status, rng). IIFE, no globals, styles
   under fc-, ends in G.puzzles.register. */
(function () {
'use strict';

/* ---------------- pure logic (exported as def.logic; tested in node) ----- */

var LOGIC = (function () {
  function log2(x) { return Math.log(x) / Math.LN2; }
  function surprisal(p) { return -log2(p); }                     // bits if THIS blows
  function entropy(vents) {                                      // H = Σ p·(−log₂p)
    var H = 0;
    for (var i = 0; i < vents.length; i++) {
      var p = vents[i].p;
      if (p > 0) H += p * surprisal(p);
    }
    return H;
  }
  // pick a vent index from the distribution given a uniform u in [0,1)
  function sampleVent(vents, u) {
    var acc = 0;
    for (var i = 0; i < vents.length; i++) {
      acc += vents[i].p;
      if (u < acc) return i;
    }
    return vents.length - 1;
  }
  // k such that p == 2^-k (0 if p is not a clean halving chain)
  function dyadicExp(p) {
    for (var k = 1; k <= 12; k++) {
      if (Math.abs(p - Math.pow(2, -k)) < 1e-9) return k;
    }
    return 0;
  }
  // the right price chip for a dyadic teach vent
  function correctPrice(p) { return Math.round(surprisal(p)); }

  /* internal teach field (GUIDE + STRIP only; mastery uses the config).
     All dyadic so pricing is whole bits and tiles are exact. H = 1.875. */
  var TEACH_VENTS = [
    { label: 'Drowse', p: 1 / 2 },
    { label: 'Puff',   p: 1 / 4 },
    { label: 'Growl',  p: 1 / 8 },
    { label: 'Howl',   p: 1 / 16 },
    { label: 'Wink',   p: 1 / 16 },
  ];
  var PRICE_CHIPS = [1, 2, 3, 4];
  var GUIDE_ERUPTIONS = 6, GUIDE_NEED = 4;

  /* 6 eruptions: one of each distinct price (1,2,3,4 bits) + 2 sampled, then
     shuffled. Any single bit-value appears at most 3 times, so pricing every
     eruption with one constant chip can never reach the 4-of-6 gate. */
  function guideSequence(rng) {
    var seq = [0, 1, 2, (rng() < 0.5 ? 3 : 4)];
    seq.push(sampleVent(TEACH_VENTS, rng()));
    seq.push(sampleVent(TEACH_VENTS, rng()));
    for (var i = seq.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = seq[i]; seq[i] = seq[j]; seq[j] = t;
    }
    return seq;
  }

  function tileValue(v) { return v.p * surprisal(v.p); }          // one H term
  function teachH() { return entropy(TEACH_VENTS); }
  // STRIP gate: every teach vent in the tray exactly once
  function assemblyOK(counts) {
    if (counts.length !== TEACH_VENTS.length) return false;
    for (var i = 0; i < counts.length; i++) if (counts[i] !== 1) return false;
    return true;
  }

  /* mastery math: camping vent v, you win iff hits ≥ ceil(goal / surprisal).
     binomTail(n,p,k) = P(Binom(n,p) ≥ k). */
  function binomTail(n, p, k) {
    if (k <= 0) return 1;
    if (k > n) return 0;
    var q = 1 - p;
    if (q <= 0) return 1;
    var term = Math.pow(q, n), below = 0;
    for (var i = 0; i < k; i++) {
      below += term;
      term = term * ((n - i) / (i + 1)) * (p / q);
    }
    var t = 1 - below;
    return t < 0 ? 0 : (t > 1 ? 1 : t);
  }
  function hitsNeeded(goal, s) {
    if (s <= 0) return Infinity;
    return Math.max(1, Math.ceil(goal / s - 1e-9));
  }
  function ventSuccess(vent, goal, rounds) {
    var k = hitsNeeded(goal, surprisal(vent.p));
    if (k === Infinity || k > rounds) return 0;
    return binomTail(rounds, vent.p, k);
  }
  function bestVentIndex(vents, goal, rounds) {
    var best = 0, bp = -1;
    for (var i = 0; i < vents.length; i++) {
      var s = ventSuccess(vents[i], goal, rounds);
      if (s > bp) { bp = s; best = i; }
    }
    return best;
  }
  function rarestIndex(vents) {
    var r = 0;
    for (var i = 1; i < vents.length; i++) if (vents[i].p < vents[r].p) r = i;
    return r;
  }
  // one simulated camping attempt (used by the scratch test's 200-run proof)
  function simulateCamp(vents, idx, goal, rounds, rng) {
    var banked = 0;
    for (var r = 0; r < rounds; r++) {
      if (sampleVent(vents, rng()) === idx) banked += surprisal(vents[idx].p);
      if (banked >= goal - 1e-9) return true;
    }
    return banked >= goal - 1e-9;
  }

  return {
    log2: log2, surprisal: surprisal, entropy: entropy, sampleVent: sampleVent,
    dyadicExp: dyadicExp, correctPrice: correctPrice,
    TEACH_VENTS: TEACH_VENTS, PRICE_CHIPS: PRICE_CHIPS,
    GUIDE_ERUPTIONS: GUIDE_ERUPTIONS, GUIDE_NEED: GUIDE_NEED,
    guideSequence: guideSequence, tileValue: tileValue, teachH: teachH,
    assemblyOK: assemblyOK, binomTail: binomTail, hitsNeeded: hitsNeeded,
    ventSuccess: ventSuccess, bestVentIndex: bestVentIndex,
    rarestIndex: rarestIndex, simulateCamp: simulateCamp,
  };
})();

/* ---------------- display helpers ---------------- */

function fmt(x, d) {
  d = (d == null) ? 2 : d;
  return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
}
function pct(p) { var v = p * 100; return (Math.round(v * 10) / 10) + '%'; }
function oddsLabel(p) {
  var k = LOGIC.dyadicExp(p);
  if (k) return '1 in ' + Math.pow(2, k);
  return pct(p);
}
function fracGlyph(p) {
  var k = LOGIC.dyadicExp(p);
  if (k === 1) return '&frac12;';
  if (k === 2) return '&frac14;';
  if (k === 3) return '&#8539;';            // ⅛
  if (k) return '1/' + Math.pow(2, k);
  return fmt(p, 2);
}
function chainGlyphs(k) {
  var parts = [];
  for (var i = 0; i < k; i++) parts.push('&frac12;');
  return parts.join(' &middot; ');
}
function chainWords(k) {
  var s = 'half';
  for (var i = 1; i < k; i++) s += ' of half';
  return s;
}

/* ---------------- styles (prefix fc-) ---------------- */

var STYLE_ID = 'fc-style';
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  var s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent =
    '.fc-wrap{display:flex;flex-direction:column;gap:0.8rem;}' +
    '.fc-flavor{color:var(--muted);font-size:0.86rem;line-height:1.5;}' +
    '.fc-flavor b{color:var(--orange);font-weight:600;}' +
    '.fc-vents{display:grid;gap:0.55rem;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));}' +
    '.fc-vent{position:relative;text-align:left;border:2px solid var(--surface2);' +
      'border-radius:12px;padding:0.7rem 0.75rem;background:var(--surface);color:var(--text);' +
      'cursor:pointer;min-height:64px;transition:border-color .15s,background .15s;overflow:hidden;}' +
    '.fc-vent:hover:not(:disabled){border-color:var(--orange);}' +
    '.fc-vent:disabled{cursor:default;}' +
    '.fc-vent.sel{border-color:var(--orange);background:rgba(251,146,60,0.12);}' +
    '.fc-vent .fc-lab{font-weight:600;font-size:0.95rem;}' +
    '.fc-vent .fc-p{color:var(--muted);font-size:0.8rem;margin-top:0.15rem;}' +
    '.fc-vent.blow{animation:fc-blow 0.7s ease-out;}' +
    '.fc-vent .fc-plume{position:absolute;left:50%;bottom:0;width:14px;height:0;' +
      'transform:translateX(-50%);background:linear-gradient(to top,var(--cyan),rgba(34,211,238,0));' +
      'border-radius:7px;pointer-events:none;opacity:0;}' +
    '.fc-vent.blow .fc-plume{animation:fc-plume 0.7s ease-out;}' +
    '@keyframes fc-blow{0%{transform:none;}25%{transform:translateY(-4px);}100%{transform:none;}}' +
    '@keyframes fc-plume{0%{height:0;opacity:0.9;}55%{height:120%;opacity:0.9;}100%{height:140%;opacity:0;}}' +
    '.fc-controls{display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap;}' +
    '.fc-controls .btn{min-height:44px;}' +
    '.fc-next{min-height:44px;align-self:flex-start;}' +
    '.fc-log{color:var(--muted);font-size:0.84rem;min-height:1.3rem;}' +
    '.fc-log .hit{color:var(--green);font-weight:600;}' +
    '.fc-log .miss{color:var(--dim);}' +
    '.fc-progwrap{display:flex;flex-direction:column;gap:0.3rem;}' +
    '.fc-progtop{display:flex;justify-content:space-between;font-size:0.82rem;color:var(--muted);}' +
    '.fc-progtop b{color:var(--green);}' +
    '.fc-bar{height:14px;}' +
    '.fc-bar .g-bar-fill{background:linear-gradient(90deg,var(--green),var(--cyan));}' +
    '.fc-pop{position:fixed;color:var(--green);font-weight:700;font-size:1.1rem;pointer-events:none;' +
      'z-index:120;text-shadow:0 1px 4px rgba(0,0,0,0.7);animation:fc-pop 0.9s ease-out forwards;}' +
    '@keyframes fc-pop{0%{opacity:0;transform:translateY(0);}15%{opacity:1;}100%{opacity:0;transform:translateY(-32px);}}' +
    '.fc-prompt{font-size:0.92rem;color:var(--text);min-height:1.4rem;line-height:1.45;}' +
    '.fc-prompt b{color:var(--orange);}' +
    '.fc-score{font-size:0.8rem;color:var(--muted);}' +
    '.fc-score b{color:var(--green);}' +
    '.fc-chips{display:flex;gap:0.5rem;flex-wrap:wrap;}' +
    '.fc-chip{flex:1 1 70px;min-height:44px;border:2px solid var(--surface2);border-radius:10px;' +
      'background:var(--surface);color:var(--text);font-size:0.92rem;cursor:pointer;' +
      'transition:border-color .15s,background .15s;}' +
    '.fc-chip:hover:not(:disabled){border-color:var(--yellow);}' +
    '.fc-chip:disabled{cursor:default;opacity:0.45;}' +
    '.fc-chip.right{border-color:var(--green);color:var(--green);opacity:1;background:rgba(52,211,153,0.1);}' +
    '.fc-chip.wrong{border-color:var(--red);color:var(--red);opacity:1;background:rgba(248,113,113,0.08);}' +
    '.fc-fcard{border:1px dashed var(--surface2);border-radius:12px;padding:0.55rem 0.7rem;' +
      'display:flex;flex-direction:column;gap:0.45rem;}' +
    '.fc-ftitle{font-size:0.72rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--gold);}' +
    '.fc-odds{display:flex;gap:0.4rem;flex-wrap:wrap;}' +
    '.fc-odd{min-height:44px;padding:0.3rem 0.75rem;border:1.5px solid var(--surface2);border-radius:999px;' +
      'background:var(--surface);color:var(--text);font-size:0.84rem;cursor:pointer;' +
      'transition:border-color .15s;}' +
    '.fc-odd:hover{border-color:var(--cyan);}' +
    '.fc-odd.on{border-color:var(--cyan);color:var(--cyan);}' +
    '.fc-fout{font-size:0.86rem;color:var(--cyan);min-height:1.2rem;font-variant-numeric:tabular-nums;line-height:1.5;}' +
    '.fc-tray{display:flex;flex-direction:column;gap:0.4rem;border:1px solid var(--surface2);' +
      'border-radius:12px;padding:0.55rem 0.7rem;}' +
    '.fc-tiles{display:flex;gap:0.4rem;flex-wrap:wrap;min-height:44px;align-items:center;}' +
    '.fc-tile{min-height:44px;padding:0.3rem 0.6rem;border:1.5px solid var(--purple);border-radius:10px;' +
      'background:rgba(167,139,250,0.08);color:var(--text);font-size:0.84rem;cursor:pointer;' +
      'font-variant-numeric:tabular-nums;}' +
    '.fc-tile b{color:var(--purple);}' +
    '.fc-tile .fc-x{color:var(--red);margin-left:0.4rem;}' +
    '.fc-empty{color:var(--dim);font-size:0.82rem;}' +
    '.fc-sum{font-size:0.9rem;color:var(--text);}' +
    '.fc-sum b{color:var(--cyan);font-variant-numeric:tabular-nums;}' +
    '.fc-gaugewrap{display:flex;flex-direction:column;gap:0.3rem;}' +
    '.fc-gauge{position:relative;height:18px;background:var(--surface2);border-radius:9px;}' +
    '.fc-gfill{position:absolute;left:0;top:0;bottom:0;width:0%;border-radius:9px;' +
      'background:linear-gradient(90deg,var(--green),var(--cyan));transition:width .07s linear;}' +
    '.fc-gmark{position:absolute;top:-3px;bottom:-3px;width:3px;background:var(--gold);border-radius:2px;}' +
    '.fc-glegend{display:flex;justify-content:space-between;font-size:0.74rem;color:var(--muted);}' +
    '.fc-glegend .fc-gh{color:var(--gold);}' +
    '.fc-fflog{font-size:0.8rem;color:var(--muted);min-height:1.2rem;font-variant-numeric:tabular-nums;}' +
    '.fc-sbs{display:flex;gap:0.6rem;flex-wrap:wrap;margin:0 0 0.45rem;}' +
    '.fc-sbs>div{flex:1 1 150px;border:1px solid var(--surface2);border-radius:10px;padding:0.45rem 0.6rem;}' +
    '.fc-sbs span{display:block;font-size:0.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;}' +
    '.fc-sbs b{font-size:1.02rem;color:var(--cyan);font-variant-numeric:tabular-nums;}' +
    '.fc-eq{color:var(--cyan);font-variant-numeric:tabular-nums;}';
  document.head.appendChild(s);
}

/* ---------------- mechanic ---------------- */

G.puzzles.register('forecast', {
  title: 'The Geyser Field',
  logic: LOGIC,   // pure functions, exposed for the scratch test only
  create: function (root, config, api) {
    injectStyle();
    var esc = G.util.esc;

    var cfgVents = (config.vents || []).map(function (v) { return { label: v.label, p: v.p }; });
    var goalBits = config.goalBits || 0;
    var rounds = config.rounds || 0;
    var Hcfg = LOGIC.entropy(cfgVents);
    var TEACH = LOGIC.TEACH_VENTS;
    var Hteach = LOGIC.teachH();

    var taughtSkip = G.pz.taught('forecast');
    var completedOnce = false;

    // carried into the debrief
    var stripDone = false, stripAvg = 0, masteryBanked = 0, masteryRoundsUsed = 0;

    var wrap = document.createElement('div');
    wrap.className = 'fc-wrap';
    root.appendChild(wrap);

    var timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    var hintSlot = null;   // recreated each phase; one coach card max in it
    function showHint(html) {
      if (!hintSlot) return;
      hintSlot.innerHTML = '';
      if (html) hintSlot.appendChild(G.pz.coachCard('sift', html));
    }

    function newPhase() {
      clearTimers();
      wrap.innerHTML = '';
      hintSlot = null;
    }

    function el(tag, cls, html) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (html != null) n.innerHTML = html;
      return n;
    }

    /* vent cards. mode: 'guide' (odds only, inert) · 'strip' (odds + price,
       tap = add tile) · 'mastery' (p only, tap = select). */
    function buildVentGrid(list, mode, onTap) {
      var grid = el('div', 'fc-vents');
      var cards = list.map(function (v, i) {
        var b = el('button', 'fc-vent' + (mode === 'mastery' && i === 0 ? ' sel' : ''));
        b.type = 'button';
        var sub;
        if (mode === 'guide') sub = 'blows ' + oddsLabel(v.p);
        else if (mode === 'strip') {
          var k = LOGIC.correctPrice(v.p);
          sub = 'blows ' + oddsLabel(v.p) + ' &middot; pays ' + k + (k === 1 ? ' bit' : ' bits');
        } else sub = 'blows ' + pct(v.p) + ' of the time';
        b.innerHTML =
          '<div class="fc-plume"></div>' +
          '<div class="fc-lab">' + esc(v.label) + '</div>' +
          '<div class="fc-p">' + sub + '</div>';
        if (onTap) b.addEventListener('click', function () { onTap(i, b); });
        else b.disabled = true;
        grid.appendChild(b);
        return b;
      });
      return { el: grid, cards: cards };
    }

    function blow(card) {
      if (!card) return;
      card.classList.remove('blow');
      void card.offsetWidth; // reflow restarts the animation
      card.classList.add('blow');
      later(function () { card.classList.remove('blow'); }, 760);
    }

    function floatPop(amount, target) {
      var r = target.getBoundingClientRect();
      var pop = el('div', 'fc-pop', '+' + fmt(amount) + ' bits');
      pop.style.left = (r.left + r.width / 2 - 28) + 'px';
      pop.style.top = (r.top + 6) + 'px';
      document.body.appendChild(pop);
      later(function () { if (pop.parentNode) pop.parentNode.removeChild(pop); }, 950);
    }

    /* Sift's formula card: tap an odds chip, the card does the log2.
       Dyadic odds get the halving chain; anything else gets −log₂(p). */
    function buildFormulaCard(list, masteryMode) {
      var card = el('div', 'fc-fcard');
      card.appendChild(el('div', 'fc-ftitle',
        'Sift&rsquo;s card &mdash; tap an odds, it does the log&#8322;'));
      var row = el('div', 'fc-odds');
      var out = el('div', 'fc-fout', 'The card waits.');
      var chips = [];
      list.forEach(function (v) {
        var label = masteryMode ? esc(v.label) + ' &middot; ' + pct(v.p) : oddsLabel(v.p);
        var c = el('button', 'fc-odd', label);
        c.type = 'button';
        c.addEventListener('click', function () {
          chips.forEach(function (x) { x.classList.remove('on'); });
          c.classList.add('on');
          var k = LOGIC.dyadicExp(v.p);
          if (k) {
            out.innerHTML = oddsLabel(v.p) + ' = ' + chainGlyphs(k) + ' &mdash; ' +
              k + ' halving' + (k === 1 ? '' : 's') + ' &rarr; &minus;log&#8322;(' +
              oddsLabel(v.p).replace('1 in ', '1/') + ') = <b>' + k +
              (k === 1 ? ' bit' : ' bits') + '</b> a blow.';
          } else {
            out.innerHTML = 'a blow at ' + pct(v.p) + ' pays &minus;log&#8322;(' +
              fmt(v.p, 2) + ') = <b>' + fmt(LOGIC.surprisal(v.p)) + ' bits</b>.' +
              (masteryMode ? ' How often it pays is your problem.' : '');
          }
          api.sfx('select');
        });
        chips.push(c);
        row.appendChild(c);
      });
      card.appendChild(row);
      card.appendChild(out);
      return card;
    }

    /* ================= HOOK ================= */

    function showHook() {
      newPhase();
      api.status('predict first');
      wrap.appendChild(el('div', 'fc-flavor',
        'Sift the fox crouches by the steaming sand, jar in paw. ' +
        '<b>&ldquo;Before you collect surprise, courier, you must learn to price it.&rdquo;</b>'));
      wrap.appendChild(G.pz.hookCard({
        question: 'Two vents: one blows 1-in-2, one only 1-in-16. ' +
          'Price each eruption in bits of surprise — how many bits is each?',
        options: [
          { label: '1 and 4', note: 'bits' },
          { label: '2 and 8', note: 'bits' },
          { label: '1 and 16', note: 'bits' },
        ],
        correct: 0,
        reveal: 'Surprise = <b>&minus;log&#8322;p</b>. The 1-in-2 vent pays <b>1 bit</b>. ' +
          'Halve the odds and you add ONE bit: 1-in-4 &rarr; 2, 1-in-8 &rarr; 3, ' +
          '1-in-16 &rarr; <b>4 bits</b>. Eight times rarer, but only four times the ' +
          'surprise — rarity is priced on a log scale.',
        onDone: function () { showGuide(); },
      }));
    }

    /* ================= GUIDE (round 1/3: pricing) ================= */

    function showGuide() {
      newPhase();
      var ladder = G.pz.hintLadder([
        '&ldquo;Use my card — tap the odds, count the halvings.&rdquo;',
        '&ldquo;1 in 2 is one halving — one bit. Every extra halving of the odds adds one more bit.&rdquo;',
        '&ldquo;Read it off: 1 in 2 &rarr; 1 bit, 1 in 4 &rarr; 2, 1 in 8 &rarr; 3, 1 in 16 &rarr; 4. Match the odds to the chip.&rdquo;',
      ]);

      wrap.appendChild(G.pz.roundBanner(1, 3, 'price the surprise'));
      wrap.appendChild(G.pz.coachCard('sift',
        '&ldquo;Every eruption gets a price tag before it goes in the jar. Rare pays more: ' +
        'surprise is <b>&minus;log&#8322;p</b>. My card does the log — you do the pricing.&rdquo;'));

      var grid = buildVentGrid(TEACH, 'guide', null);
      wrap.appendChild(grid.el);

      var prompt = el('div', 'fc-prompt', 'The sand stirs&hellip;');
      wrap.appendChild(prompt);

      var chipRow = el('div', 'fc-chips');
      var chips = LOGIC.PRICE_CHIPS.map(function (k) {
        var c = el('button', 'fc-chip', k + (k === 1 ? ' bit' : ' bits'));
        c.type = 'button';
        c.disabled = true;
        c.addEventListener('click', function () { price(k); });
        chipRow.appendChild(c);
        return c;
      });
      wrap.appendChild(chipRow);

      var score = el('div', 'fc-score', '');
      wrap.appendChild(score);
      wrap.appendChild(buildFormulaCard(TEACH.slice(0, 4), false)); // odds 1in2..1in16
      hintSlot = el('div', null);
      wrap.appendChild(hintSlot);

      var seq = LOGIC.guideSequence(api.rng);
      var at = 0, right = 0, banked = 0, pricing = false;

      function setChips(on) { chips.forEach(function (c) { c.disabled = !on; }); }
      function clearChipMarks() {
        chips.forEach(function (c) { c.classList.remove('right', 'wrong'); });
      }
      function updateScore() {
        score.innerHTML = 'priced right: <b>' + right + '</b> / ' + at + ' seen of ' +
          LOGIC.GUIDE_ERUPTIONS + ' &middot; gate: ' + LOGIC.GUIDE_NEED + ' right &middot; jar +' +
          fmt(banked, 0) + ' bits';
        api.status('round 1/3 &middot; priced ' + right + '/' + at);
      }
      updateScore();

      function fireNext() {
        if (at >= seq.length) { evalGate(); return; }
        clearChipMarks();
        prompt.innerHTML = 'The sand stirs&hellip;';
        later(function () {
          var vi = seq[at];
          api.sfx('quake');
          blow(grid.cards[vi]);
          later(function () {
            var v = TEACH[vi];
            prompt.innerHTML = '<b>' + esc(v.label) + '</b> blew &mdash; odds <b>' +
              oddsLabel(v.p) + '</b>. Price the surprise:';
            pricing = true;
            setChips(true);
          }, 760);
        }, 420);
      }

      function price(k) {
        if (!pricing) return;
        pricing = false;
        setChips(false);
        var vi = seq[at];
        var v = TEACH[vi];
        var correct = LOGIC.correctPrice(v.p);
        chips.forEach(function (c, ci) {
          var val = LOGIC.PRICE_CHIPS[ci];
          if (val === correct) c.classList.add('right');
          else if (val === k) c.classList.add('wrong');
        });
        if (k === correct) {
          right++; banked += correct;
          api.sfx('spark');
          floatPop(correct, grid.cards[vi]);
          prompt.innerHTML = '<b>' + esc(v.label) + '</b> priced right &mdash; <b>' +
            correct + (correct === 1 ? ' bit' : ' bits') + '</b> banked.';
          showHint(null);
        } else {
          api.sfx('bump');
          var kk = LOGIC.dyadicExp(v.p);
          prompt.innerHTML = 'Mispriced &mdash; it was worth <b>' + correct +
            (correct === 1 ? ' bit' : ' bits') + '</b>.';
          showHint('&ldquo;' + esc(v.label) + ' blows ' + oddsLabel(v.p) + ' — that is ' +
            chainWords(kk) + ': <b>' + kk + ' halving' + (kk === 1 ? '' : 's') + ', ' + kk +
            (kk === 1 ? ' bit' : ' bits') + '</b>. Each halving adds one.&rdquo;');
        }
        at++;
        updateScore();
        later(fireNext, 1050);
      }

      function evalGate() {
        if (right >= LOGIC.GUIDE_NEED) {
          ladder.reset();
          prompt.innerHTML = 'The jar hums &mdash; <b>' + right + ' of ' +
            LOGIC.GUIDE_ERUPTIONS + '</b> priced right.';
          showHint('&ldquo;Priced like a born collector. Now the bigger question — ' +
            'what does this whole field pay <b>on average</b>, per blow?&rdquo;');
          var nextB = el('button', 'btn btn-primary fc-next', 'Next &mdash; the going rate');
          nextB.type = 'button';
          nextB.addEventListener('click', function () { showStrip(); });
          wrap.appendChild(nextB);
          nextB.scrollIntoView({ block: 'nearest' });
        } else {
          api.fail('Only ' + right + ' of ' + LOGIC.GUIDE_ERUPTIONS +
            ' priced right — the jar wants ' + LOGIC.GUIDE_NEED + '.');
          var h = ladder.fail();
          if (h) showHint(h);
          clearChipMarks();
          prompt.innerHTML = 'The jar tips your readings out. Fresh eruptions&hellip;';
          later(function () {
            seq = LOGIC.guideSequence(api.rng);
            at = 0; right = 0; banked = 0;
            updateScore();
            fireNext();
          }, 1250);
        }
      }

      fireNext();
    }

    /* ================= STRIP (round 2/3: assemble H) ================= */

    function showStrip() {
      newPhase();
      var ladder = G.pz.hintLadder([
        '&ldquo;The average listens to every vent — weight each payout by its chance.&rdquo;',
        '&ldquo;One tile per vent: chance &times; bits. None left out, none twice — the &times;p already says how often it speaks.&rdquo;',
        '&ldquo;Tap all five vents once each: &frac12;&times;1 + &frac14;&times;2 + &#8539;&times;3 + 1/16&times;4 + 1/16&times;4 = 1.875 bits.&rdquo;',
      ]);

      wrap.appendChild(G.pz.roundBanner(2, 3, 'the field’s going rate'));
      wrap.appendChild(el('div', 'fc-flavor',
        'One eruption is coming &mdash; vent unknown. <b>What does the field pay on ' +
        'average?</b> Build the average: each vent&rsquo;s chance &times; its bits, into the tray.'));

      var tray = [];          // vent indices, duplicates allowed (that IS the trap)
      var locked = false;

      var grid = buildVentGrid(TEACH, 'strip', function (vi) {
        if (locked) return;
        tray.push(vi);
        api.sfx('select');
        renderTray();
      });
      wrap.appendChild(grid.el);

      var trayBox = el('div', 'fc-tray');
      trayBox.appendChild(el('div', 'fc-ftitle', 'sum tray &mdash; your average, term by term'));
      var tiles = el('div', 'fc-tiles');
      trayBox.appendChild(tiles);
      var sumLine = el('div', 'fc-sum', '');
      trayBox.appendChild(sumLine);
      wrap.appendChild(trayBox);

      var controls = el('div', 'fc-controls');
      var commitB = el('button', 'btn btn-primary', 'Commit the estimate');
      commitB.type = 'button';
      controls.appendChild(commitB);
      wrap.appendChild(controls);

      wrap.appendChild(buildFormulaCard(TEACH.slice(0, 4), false));
      hintSlot = el('div', null);
      wrap.appendChild(hintSlot);

      function traySum() {
        var s = 0;
        for (var i = 0; i < tray.length; i++) s += LOGIC.tileValue(TEACH[tray[i]]);
        return s;
      }
      function renderTray() {
        tiles.innerHTML = '';
        if (!tray.length) {
          tiles.appendChild(el('div', 'fc-empty', 'tap vents to add their p &times; bits term'));
        }
        tray.forEach(function (vi, ti) {
          var v = TEACH[vi];
          var k = LOGIC.correctPrice(v.p);
          var t = el('button', 'fc-tile',
            '<b>' + esc(v.label) + '</b> ' + fracGlyph(v.p) + ' &times; ' + k + ' = ' +
            fmt(LOGIC.tileValue(v), 3) + '<span class="fc-x">&#10005;</span>');
          t.type = 'button';
          t.title = 'remove this term';
          t.addEventListener('click', function () {
            if (locked) return;
            tray.splice(ti, 1);
            api.sfx('bump');
            renderTray();
          });
          tiles.appendChild(t);
        });
        sumLine.innerHTML = 'your estimate: <b>&Sigma; = ' + fmt(traySum(), 3) + ' bits</b> per blow';
        commitB.disabled = !tray.length;
        api.status('round 2/3 &middot; &Sigma; ' + fmt(traySum(), 3) + ' bits');
      }
      renderTray();

      function diagnose(counts) {
        var missing = [], dup = [];
        TEACH.forEach(function (v, i) {
          if (counts[i] === 0) missing.push(esc(v.label));
          else if (counts[i] > 1) dup.push(esc(v.label));
        });
        if (missing.length && dup.length) {
          return '&ldquo;The tray double-counts ' + dup.join(', ') + ' and ignores ' +
            missing.join(', ') + '. One tile per vent — the &times;p does the weighting.&rdquo;';
        }
        if (dup.length) {
          return '&ldquo;' + dup.join(', ') + ' is in more than once. Its chance — the &times;p — ' +
            'already says how often it speaks. Once each.&rdquo;';
        }
        if (missing.length) {
          return '&ldquo;Your average ignores ' + missing.join(', ') + ' — every vent gets a say, ' +
            'weighted by its chance.&rdquo;';
        }
        return '&ldquo;One tile per vent: chance &times; bits, once each.&rdquo;';
      }

      commitB.addEventListener('click', function () {
        if (locked || !tray.length) return;
        var counts = TEACH.map(function () { return 0; });
        tray.forEach(function (vi) { counts[vi]++; });
        if (!LOGIC.assemblyOK(counts)) {
          api.fail('Not the field’s average yet.');
          var h = ladder.fail();
          showHint(h || diagnose(counts));
          return;
        }
        ladder.reset();
        locked = true;
        commitB.disabled = true;
        grid.cards.forEach(function (c) { c.disabled = true; });
        sumLine.innerHTML = 'committed: <b>H = ' + fmt(Hteach, 3) +
          ' bits</b> per blow &mdash; your claim for the going rate.';
        api.sfx('spark');
        showHint(null);
        later(startFastForward, 550);
      });

      var SCALE = 4.5; // gauge x-axis, bits
      function startFastForward() {
        var gw = el('div', 'fc-gaugewrap');
        gw.appendChild(el('div', 'fc-glegend',
          '<span>running average of real blows</span><span class="fc-gh">| your H = ' +
          fmt(Hteach, 3) + '</span>'));
        var gauge = el('div', 'fc-gauge');
        var fill = el('div', 'fc-gfill');
        var mark = el('div', 'fc-gmark');
        mark.style.left = (Hteach / SCALE * 100) + '%';
        gauge.appendChild(fill);
        gauge.appendChild(mark);
        gw.appendChild(gauge);
        var ffLog = el('div', 'fc-fflog', 'fast-forward: the field blows 40 times&hellip;');
        gw.appendChild(ffLog);
        wrap.appendChild(gw);
        gw.scrollIntoView({ block: 'nearest' });

        var n = 0, total = 0, N = 40;
        function step() {
          if (n >= N) { finish(); return; }
          var vi = LOGIC.sampleVent(TEACH, api.rng());
          var v = TEACH[vi];
          n++;
          total += LOGIC.surprisal(v.p);
          var avg = total / n;
          blow(grid.cards[vi]);
          fill.style.width = Math.min(100, avg / SCALE * 100) + '%';
          ffLog.innerHTML = 'blow ' + n + '/' + N + ' &middot; ' + esc(v.label) + ' (' +
            LOGIC.correctPrice(v.p) + ' bits) &middot; running average <b>' +
            fmt(avg) + '</b> bits';
          later(step, 75);
        }
        function finish() {
          stripDone = true;
          stripAvg = total / N;
          api.sfx('spark');
          showHint('&ldquo;Forty real blows, averaging <b>' + fmt(stripAvg) +
            ' bits</b> — settling onto your ' + fmt(Hteach, 3) +
            '. The average surprise of a field has a name: <b>entropy</b>. ' +
            'Now — a wilder field, and no price tags.&rdquo;');
          var nextB = el('button', 'btn btn-primary fc-next', 'Next &mdash; the wild field');
          nextB.type = 'button';
          nextB.addEventListener('click', function () { showMastery(); });
          wrap.appendChild(nextB);
          nextB.scrollIntoView({ block: 'nearest' });
        }
        later(step, 350);
      }
    }

    /* ================= MASTERY (round 3/3: the config field) ============ */

    function showMastery() {
      newPhase();

      var rarestI = cfgVents.length ? LOGIC.rarestIndex(cfgVents) : -1;
      var bestI = cfgVents.length ? LOGIC.bestVentIndex(cfgVents, goalBits, rounds) : -1;
      var hints = [];
      if (rarestI >= 0) {
        hints.push('&ldquo;' + esc(cfgVents[rarestI].label) + ' pays ' +
          fmt(LOGIC.surprisal(cfgVents[rarestI].p)) + ' bits a blow — but blows ' +
          pct(cfgVents[rarestI].p) + ' of rounds. Count your rounds: will it even go off enough?&rdquo;');
      }
      hints.push('&ldquo;Weigh every vent: how often it blows &times; what a blow pays. Steady out-earns flashy.&rdquo;');
      if (bestI >= 0) {
        hints.push('&ldquo;Camp <b>' + esc(cfgVents[bestI].label) + '</b> the whole way: about ' +
          pct(cfgVents[bestI].p) + ' of rounds it pays ' +
          fmt(LOGIC.surprisal(cfgVents[bestI].p)) +
          ' bits — across ' + rounds + ' rounds that clears ' + fmt(goalBits, 1) +
          ' bits with room.&rdquo;');
      }
      var ladder = G.pz.hintLadder(hints);

      wrap.appendChild(taughtSkip
        ? G.pz.roundBanner(1, 1, 'mastery — fill the jar')
        : G.pz.roundBanner(3, 3, 'fill the jar'));
      wrap.appendChild(el('div', 'fc-flavor',
        'The surprise-jar waits. <b>Camp the collector on one vent each round</b>; ' +
        'the field decides where it blows. Hit your vent and bank its surprise — ' +
        'fill the jar before the wind dies.'));

      if (!taughtSkip && rarestI >= 0) {
        wrap.appendChild(G.pz.coachCard('sift',
          '&ldquo;No price tags out here. ' + esc(cfgVents[rarestI].label) + ' pays ' +
          fmt(LOGIC.surprisal(cfgVents[rarestI].p)) +
          ' bits&hellip; <b>when</b> it pays. Weigh how often against how much.&rdquo;'));
      }

      // jar progress
      var progWrap = el('div', 'fc-progwrap');
      var progTop = el('div', 'fc-progtop',
        '<span>Banked surprise</span><span><b class="fc-banked">0.00</b> / ' +
        fmt(goalBits) + ' bits</span>');
      var bar = el('div', 'g-bar fc-bar', '<div class="g-bar-fill" style="width:0%"></div>');
      progWrap.appendChild(progTop);
      progWrap.appendChild(bar);
      wrap.appendChild(progWrap);
      var bankedEl = progTop.querySelector('.fc-banked');
      var barFill = bar.querySelector('.g-bar-fill');

      var state = { round: 0, banked: 0, sel: 0, watching: false, won: false };

      var grid = buildVentGrid(cfgVents, 'mastery', function (i) {
        if (state.watching || state.won) return;
        state.sel = i;
        grid.cards.forEach(function (c, ci) { c.classList.toggle('sel', ci === i); });
        api.sfx('select');
      });
      wrap.appendChild(grid.el);

      var controls = el('div', 'fc-controls');
      var watchBtn = el('button', 'btn btn-primary', 'WATCH the field');
      watchBtn.type = 'button';
      controls.appendChild(watchBtn);
      wrap.appendChild(controls);
      var log = el('div', 'fc-log', 'Camp a vent, then watch.');
      wrap.appendChild(log);

      if (cfgVents.length) wrap.appendChild(buildFormulaCard(cfgVents, true));
      hintSlot = el('div', null);
      wrap.appendChild(hintSlot);

      function setStatus() {
        api.status('round ' + Math.min(state.round + (state.won ? 0 : 1), rounds) +
          '/' + rounds + ' &middot; banked ' + fmt(state.banked) + ' bits');
      }
      function refreshProgress() {
        bankedEl.textContent = fmt(state.banked);
        var frac = goalBits > 0 ? Math.min(1, state.banked / goalBits) : 0;
        barFill.style.width = (frac * 100).toFixed(1) + '%';
      }
      function setEnabled(on) {
        grid.cards.forEach(function (c) { c.disabled = !on; });
        watchBtn.disabled = !on;
      }
      setStatus();
      refreshProgress();

      function resetAttempt() {
        state.round = 0; state.banked = 0; state.watching = false; state.won = false;
        log.innerHTML = 'The wind picks back up. Fresh field, fresh luck.';
        refreshProgress();
        setStatus();
        setEnabled(true);
      }

      watchBtn.addEventListener('click', function () {
        if (state.watching || state.won || !cfgVents.length) return;
        if (state.round >= rounds) return;
        state.watching = true;
        setEnabled(false);

        var picked = state.sel;
        var blew = LOGIC.sampleVent(cfgVents, api.rng());
        api.sfx('quake');
        blow(grid.cards[blew]);

        later(function () {
          state.round++;
          if (blew === picked) {
            var gain = LOGIC.surprisal(cfgVents[blew].p);
            state.banked += gain;
            refreshProgress();
            floatPop(gain, grid.cards[blew]);
            api.sfx('spark');
            log.innerHTML = '<span class="hit">' + esc(cfgVents[blew].label) +
              ' blew &mdash; your vent! Banked +' + fmt(gain) + ' bits.</span>';
          } else {
            api.sfx('bump');
            log.innerHTML = '<span class="miss">' + esc(cfgVents[blew].label) +
              ' blew. Your collector sat quiet. (0 bits)</span>';
          }
          setStatus();

          if (goalBits > 0 && state.banked >= goalBits - 1e-9) {
            state.won = true;
            masteryBanked = state.banked;
            masteryRoundsUsed = state.round;
            ladder.reset();
            setEnabled(false);
            setStatus();
            if (!G.pz.taught('forecast')) G.pz.markTaught('forecast');
            later(showDebrief, 650);
            return;
          }
          if (state.round >= rounds) {
            api.fail('The wind dies down — the jar stays light.');
            var h = ladder.fail();
            if (h) showHint(h);
            later(function () { if (!state.won) resetAttempt(); }, 1200);
            return;
          }
          state.watching = false;
          setEnabled(true);
        }, 720);
      });
    }

    /* ================= DEBRIEF ================= */

    function showDebrief() {
      showHint(null);
      wrap.appendChild(G.pz.coachCard('sift',
        '&ldquo;Into the jar it goes. Average surprise — the old keepers called it ' +
        '<b>entropy</b>. I just call it the going rate.&rdquo;'));

      var html = '';
      if (stripDone) {
        html +=
          '<div class="fc-sbs">' +
            '<div><span>your assembled H</span><b>' + fmt(Hteach, 3) + ' bits</b></div>' +
            '<div><span>field average (40 real blows)</span><b>' + fmt(stripAvg) + ' bits</b></div>' +
          '</div>';
      }
      html += '<p>Each blow pays its surprise, &minus;log&#8322;p; weight every vent by its ' +
        'chance and the field&rsquo;s average is <span class="fc-eq">H = &Sigma; ' +
        'p&middot;log&#8322;(1/p)</span>.';
      if (stripDone) {
        html += ' You assembled that sum term by term — and watched the live field ' +
          'converge onto your number.';
      }
      html += '</p><p>The wild field you just camped runs at <span class="fc-eq">H = ' +
        fmt(Hcfg) + ' bits</span> a blow. You banked <span class="fc-eq">' +
        fmt(masteryBanked) + ' bits</span> in ' + masteryRoundsUsed +
        ' rounds by weighing chance &times; worth — not by chasing the flashiest payout. ' +
        'That going rate is the <b>source coding floor</b>: no honest log of this field ' +
        'spends fewer bits per eruption, on average.</p>';

      wrap.appendChild(G.pz.debriefCard({
        title: 'Average surprise IS entropy.',
        html: html,
        buttonLabel: 'Leave the field',
        tone: 'win',
        onButton: function () {
          if (completedOnce) return;
          completedOnce = true;
          api.complete();
        },
      }));
      wrap.lastChild.scrollIntoView({ block: 'nearest' });
    }

    /* ================= boot ================= */

    if (taughtSkip) showMastery();
    else showHook();

    return {
      destroy: function () {
        clearTimers();
        var pops = document.querySelectorAll('.fc-pop');
        for (var i = 0; i < pops.length; i++) {
          if (pops[i].parentNode) pops[i].parentNode.removeChild(pops[i]);
        }
      }
    };
  }
});

})();
