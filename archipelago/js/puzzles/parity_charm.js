/* THE QUIET ARCHIPELAGO — puzzle mechanic: 'parity-charm'
   The Parity Sisters' crossing charms (Static Strait + Grand Beacon).
   Config (FROZEN, schema 7): { dataBits:k, mode:'detect'|'correct', trips:t }
   - detect: one parity charm; rig the codeword even; the storm flips <=1 chip
     per crossing; declare CLEAN / CORRUPTED. Gate: t right calls IN A ROW —
     a wrong call resets the streak with fresh randomness, and every window of
     t crossings is scripted to contain both flips and one clean crossing, so
     spamming either button can never converge. First completion ends with a
     scripted TWO-FLIP demonstration (parity passes, message wrong) before the
     debrief; the demo never fails and never double-fires complete().
   - correct: k forced to 4, wired as Hamming(7,4); three charms (Ada/Bea/Cee)
     each keep their own group even; the storm flips <=1 of the 7 chips; the
     player's FIRST tap must be the flipped chip (or 'All clean') — any guess
     resets the round with a fresh flip and drops the streak to 0.
   Teaching loop per ../../PEDAGOGY.md §1/§6.7: hook (detect only) -> guided
   first crossing -> stripped crossings -> streak gate -> two-flip demo
   (detect, first time only) -> debrief. Taught flags are PER MODE:
   'parity-charm-detect' and 'parity-charm-correct' (so the first correct-mode
   door still teaches after a detect door was passed). Coaches: ada (detect),
   bea (correct), via G.pz.
   Contract: ../../DESIGN.md. complete() exactly once; never binds Esc;
   destroy() clears timers; clean re-create. Pure logic exposed under `_test`
   on the registered def for the node harness (_smoke/pz_test_parity-charm.mjs). */
(function () {
'use strict';

/* ============================ pure logic ============================ */
/* (exhaustively verified by _smoke/pz_test_parity-charm.mjs: detect catches
   every single flip and misses every double; Hamming(7,4) gives a unique
   syndrome per single flip; two flips decode to the symmetric difference —
   a confident wrong chip; the no-guess gate cannot be beaten by guessing.) */

function countOnes(bits) {
  var n = 0;
  for (var i = 0; i < bits.length; i++) n += bits[i];
  return n;
}
function isEven(bits) { return (countOnes(bits) & 1) === 0; }

/* detect mode: the parity charm value that makes the whole message even. */
function detectCharm(data) { return countOnes(data) & 1; }

/* --- Hamming(7,4), 1-based positions 1..7 ---
   pos 1=A∩B, 2=A∩C, 3=B∩C, 4=A∩B∩C, 5=A only(p1), 6=B only(p2), 7=C only(p3)
   Charm A watches data {1,2,4} (+ its own parity 5)
   Charm B watches data {1,3,4} (+ its own parity 6)
   Charm C watches data {2,3,4} (+ its own parity 7) */
var CHARMS = ['A', 'B', 'C'];
var DATA_OF = { A: [1, 2, 4], B: [1, 3, 4], C: [2, 3, 4] };   // data bits each charm watches
var PAR_OF = { A: 5, B: 6, C: 7 };                            // each charm's own parity bit
var CHECK_OF = { A: [1, 2, 4, 5], B: [1, 3, 4, 6], C: [2, 3, 4, 7] }; // full parity check
/* which charms include each position (for the colored brackets / syndrome) */
var MEMBER = { 1: ['A', 'B'], 2: ['A', 'C'], 3: ['B', 'C'], 4: ['A', 'B', 'C'], 5: ['A'], 6: ['B'], 7: ['C'] };

/* given data bits at positions 1..4, the parity charm value for one charm. */
function hammingCharm(code, charm) {
  var s = 0, ds = DATA_OF[charm];
  for (var i = 0; i < ds.length; i++) s += code[ds[i]];
  return s & 1;
}
/* which charms see ODD parity in a 1-based code[1..7]. returns e.g. ['A','B'] */
function syndrome(code) {
  var out = [];
  for (var i = 0; i < CHARMS.length; i++) {
    var c = CHARMS[i], ps = CHECK_OF[c], sum = 0;
    for (var j = 0; j < ps.length; j++) sum += code[ps[j]];
    if (sum & 1) out.push(c);
  }
  return out;
}
/* the unique position whose membership == the odd-charm set (0 = clean). */
function positionFromSyndrome(odd) {
  if (odd.length === 0) return 0;
  var key = odd.slice().sort().join('');
  for (var p = 1; p <= 7; p++) {
    if (MEMBER[p].slice().sort().join('') === key) return p;
  }
  return -1;
}

/* ---- gate predicates (the no-guessing rule + streak) ---- */
/* correct mode: first tap on a chip — win only if it IS the named flip. */
function pickOutcome(ans, pos) { return (ans !== 0 && pos === ans) ? 'win' : 'reset'; }
/* correct mode: the 'All clean' button — win only if the syndrome is empty. */
function cleanOutcome(ans) { return ans === 0 ? 'win' : 'reset'; }
/* detect mode: the declaration must match what actually happened. */
function declareOutcome(truthCorrupted, saysCorrupted) {
  return truthCorrupted === saysCorrupted ? 'win' : 'reset';
}
function streakAfter(streak, won) { return won ? streak + 1 : 0; }
/* per-window flip schedule: trip 0 always flips (teach the catch first);
   EXACTLY ONE clean crossing at a random later index. This is the kill-switch:
   spamming CLEAN (or 'All clean') dies on the flips, spamming CORRUPTED (or
   rune-tapping) dies on the guaranteed clean trip — no constant or rune-only
   strategy can ever finish a window. */
function makeSchedule(t, rng) {
  var s = [];
  for (var i = 0; i < t; i++) s.push(true);
  if (t >= 2) s[1 + Math.floor(rng() * (t - 1))] = false;
  return s;
}

/* ============================ style ============================ */
var STYLE_ID = 'pc-style';
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  var s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent =
  '.pc-wrap{display:flex;flex-direction:column;gap:.8rem}' +
  '.pc-rain{color:var(--muted);font-size:.85rem;line-height:1.5}' +
  '.pc-rain b{color:var(--blue);font-weight:600}' +
  '.pc-phase{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}' +
  '.pc-bits{display:flex;gap:.5rem;flex-wrap:wrap;align-items:flex-end;justify-content:center}' +
  '.pc-cell{display:flex;flex-direction:column;align-items:center;gap:.25rem}' +
  '.pc-brk{display:flex;gap:2px;height:14px;align-items:flex-end}' +
  '.pc-brk i{width:6px;height:10px;border-radius:2px;display:inline-block}' +
  '.pc-chip{width:44px;height:44px;min-width:44px;border-radius:10px;border:2px solid var(--surface2);' +
    'background:var(--surface);color:var(--text);font-size:1.25rem;font-weight:700;cursor:default;' +
    'display:flex;align-items:center;justify-content:center;transition:all .12s}' +
  '.pc-chip.pc-charm{cursor:pointer;border-color:var(--purple);color:var(--purple)}' +
  '.pc-chip.pc-charm:hover{background:var(--surface2)}' +
  '.pc-chip.pc-one{background:rgba(56,189,248,.18);border-color:var(--blue);color:var(--blue)}' +
  '.pc-chip.pc-charm.pc-one{background:rgba(167,139,250,.2);border-color:var(--purple);color:var(--purple)}' +
  '.pc-chip.pc-pick{cursor:pointer}' +
  '.pc-chip.pc-pick:hover{border-color:var(--yellow);color:var(--yellow)}' +
  '.pc-chip.pc-flipd{outline:2px solid var(--red);outline-offset:2px}' +
  '.pc-chip.pc-hintglow{outline:2px dashed var(--yellow);outline-offset:2px}' +
  '.pc-chip.pc-mini{width:30px;height:30px;min-width:30px;font-size:.85rem;border-radius:7px;border-width:1px}' +
  '.pc-cmp{display:flex;flex-direction:column;gap:.35rem;align-items:center}' +
  '.pc-cmprow{display:flex;gap:.3rem;align-items:center;justify-content:center;flex-wrap:wrap}' +
  '.pc-cmplab{font-size:.68rem;color:var(--dim);min-width:52px;text-align:right;letter-spacing:.05em}' +
  '.pc-lab{font-size:.62rem;color:var(--dim);letter-spacing:.05em}' +
  '.pc-meter{text-align:center;font-size:.92rem}' +
  '.pc-meter.pc-dimnote{font-size:.74rem;color:var(--dim)}' +
  '.pc-even{color:var(--green);font-weight:600}' +
  '.pc-odd{color:var(--red);font-weight:600}' +
  '.pc-charms{display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center}' +
  '.pc-charmcard{flex:1 1 30%;min-width:120px;text-align:center;padding:.5rem;border-radius:10px;' +
    'border:1px solid var(--surface2);background:var(--surface)}' +
  '.pc-charmcard.pc-good{border-color:var(--green)}' +
  '.pc-charmcard.pc-bad{border-color:var(--surface2)}' +
  '.pc-cname{font-size:.78rem;font-weight:700;letter-spacing:.08em}' +
  '.pc-cwatch{font-size:.66rem;color:var(--muted);margin:.2rem 0}' +
  '.pc-nod{font-size:.72rem;min-height:1em}' +
  '.pc-nod.pc-ok{color:var(--green)}' +
  '.pc-nod.pc-no{color:var(--dim)}' +
  '.pc-ring{font-size:.78rem;padding:.15rem .55rem;border-radius:99px;border:1px solid var(--surface2)}' +
  '.pc-ring.pc-rgreen{color:var(--green);border-color:var(--green)}' +
  '.pc-ring.pc-rred{color:var(--red);border-color:var(--red);background:rgba(248,113,113,.12)}' +
  '.pc-actions{display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center}' +
  '.pc-actions .btn{min-height:44px;min-width:120px}' +
  '.pc-boatlane{position:relative;height:64px;border-radius:10px;overflow:hidden;' +
    'background:linear-gradient(180deg,#16223e 0%,#0f1c33 100%);border:1px solid var(--surface2)}' +
  '.pc-waves{position:absolute;inset:0;background-repeat:repeat-x;opacity:.5;' +
    'background-image:radial-gradient(circle at 10px 40px,rgba(56,189,248,.25) 3px,transparent 4px),' +
    'radial-gradient(circle at 30px 50px,rgba(56,189,248,.18) 3px,transparent 4px);' +
    'background-size:48px 64px;animation:pc-wave 2.2s linear infinite}' +
  '@keyframes pc-wave{from{background-position:0 0}to{background-position:48px 0}}' +
  '.pc-boat{position:absolute;top:18px;left:-44px;font-size:1.6rem;will-change:left;' +
    'filter:drop-shadow(0 2px 2px rgba(0,0,0,.5))}' +
  '.pc-storm{position:absolute;top:2px;right:8px;font-size:.7rem;color:var(--muted)}' +
  '.pc-feedback{min-height:1.2em;text-align:center;font-size:.9rem}' +
  '.pc-feedback.pc-good{color:var(--green)}' +
  '.pc-feedback.pc-bad{color:var(--yellow)}' +
  '.pc-prog{text-align:center;font-size:.82rem;color:var(--muted)}' +
  '.pc-syn{margin:0 auto;border-collapse:collapse;font-size:.78rem;font-variant-numeric:tabular-nums}' +
  '.pc-syn th{font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);font-weight:600}' +
  '.pc-syn td,.pc-syn th{padding:.18rem .5rem;text-align:center;border-bottom:1px solid var(--surface2)}' +
  '.pc-syn .pc-dim{color:var(--dim)}' +
  '.pc-brkline{display:none}' +
  '@media (max-width:560px){.pc-charmcard{flex-basis:46%}' +
    '.pc-brkline{display:block;flex-basis:100%;height:0}}';
  document.head.appendChild(s);
}

/* charm color per name (matches venn-lock ring colors) */
var CHARM_COLOR = { A: 'var(--red)', B: 'var(--green)', C: 'var(--blue)' };

function sisterName(c) { return c === 'A' ? 'Ada' : c === 'B' ? 'Bea' : 'Cee'; }
function sisterList(arr, joiner) {
  var names = [];
  for (var i = 0; i < arr.length; i++) names.push(sisterName(arr[i]));
  return names.join(joiner || ' and ');
}
/* "Ada", "Ada and Bea", "Ada, Bea and Cee" */
function nameList(arr, bold) {
  var names = [];
  for (var i = 0; i < arr.length; i++) {
    names.push(bold ? '<b>' + sisterName(arr[i]) + '</b>' : sisterName(arr[i]));
  }
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}
function posLabel(p) { return p <= 4 ? ('d' + p) : ('p' + (p - 4)); }

/* the filled syndrome decoder table for the correct-mode debrief */
function synTableHtml() {
  var rows = [
    [[], 'clean'],
    [['A'], 'p1'], [['B'], 'p2'], [['C'], 'p3'],
    [['A', 'B'], 'd1'], [['A', 'C'], 'd2'], [['B', 'C'], 'd3'], [['A', 'B', 'C'], 'd4'],
  ];
  var h = '<table class="pc-syn"><tr><th>Ada</th><th>Bea</th><th>Cee</th><th></th><th>flip</th></tr>';
  for (var r = 0; r < rows.length; r++) {
    h += '<tr>';
    for (var i = 0; i < CHARMS.length; i++) {
      var cn = CHARMS[i];
      h += '<td>' + (rows[r][0].indexOf(cn) >= 0
        ? '<b style="color:' + CHARM_COLOR[cn] + '">ODD</b>'
        : '<span class="pc-dim">even</span>') + '</td>';
    }
    h += '<td class="pc-dim">→</td><td><b>' + rows[r][1] + '</b></td></tr>';
  }
  return h + '</table>';
}

/* ============================ mechanic ============================ */
G.puzzles.register('parity-charm', {
  title: 'The Parity Sisters’ Charm',
  /* pure functions for the node logic harness — not used by the engine */
  _test: {
    countOnes: countOnes, isEven: isEven, detectCharm: detectCharm,
    hammingCharm: hammingCharm, syndrome: syndrome,
    positionFromSyndrome: positionFromSyndrome,
    MEMBER: MEMBER, DATA_OF: DATA_OF, PAR_OF: PAR_OF, CHECK_OF: CHECK_OF,
    pickOutcome: pickOutcome, cleanOutcome: cleanOutcome,
    declareOutcome: declareOutcome, streakAfter: streakAfter,
    makeSchedule: makeSchedule,
  },
  create: function (root, config, api) {
    injectStyle();

    var k = Math.max(1, (config && config.dataBits) || 4);
    var mode = (config && config.mode) === 'correct' ? 'correct' : 'detect';
    var totalTrips = Math.max(1, (config && config.trips) || 3);
    /* correct mode is wired specifically as Hamming(7,4): force k=4. */
    if (mode === 'correct') k = 4;

    var taughtKey = 'parity-charm-' + mode;          // per-mode taught flag
    var taughtHere = G.pz.taught(taughtKey);          // repeat encounter?
    var coachWho = mode === 'detect' ? 'ada' : 'bea';

    var streak = 0;           // clean crossings in a row (the gate)
    var schedule = [];        // current window's flip plan
    var timers = [];          // animation timeouts to clear on destroy
    var finished = false;     // guards complete()
    var phase = 'rig';        // 'hook' | 'rig' | 'cross' | 'declare' | 'demo' | 'debrief'

    /* hint ladder (PEDAGOGY §1.7) — tokens map to mode-specific dynamic text */
    var ladder = G.pz.hintLadder(['1', '2', '3']);
    var pendingHint = 0;      // 0 = none, 1..3 = level for the NEXT declare

    /* per-trip state */
    var data = [];            // k message bits
    var detectBit = 0;        // detect-mode charm value (player-set)
    var charmBit = { A: 0, B: 0, C: 0 }; // correct-mode charm values
    var received = [];        // detect: 0-based length k+1; correct: 1-based [.,1..7]
    var flippedPos = -1;      // storm flip (-1 none); correct=1..7, detect=0..k
    var demo = null;          // two-flip demonstration state

    var wrap = document.createElement('div');
    wrap.className = 'pc-wrap';
    root.appendChild(wrap);

    function clearTimers() {
      for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
      timers = [];
    }
    function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }

    function updateStatus() {
      api.status('In a row: <b style="color:var(--green)">' + streak + '</b> / ' + totalTrips +
        ' &middot; ' + mode + ' mode');
    }
    /* GUIDE = first crossing of a window, first encounter of this mode only */
    function guided() { return !taughtHere && streak === 0; }

    /* ---- window / trip orchestration ---- */
    function newWindow() {
      streak = 0;
      schedule = makeSchedule(totalTrips, api.rng);
      newTrip();
    }
    function newTrip() {
      clearTimers();
      phase = 'rig';
      data = [];
      for (var i = 0; i < k; i++) data.push(api.rng() < 0.5 ? 0 : 1);
      detectBit = 0;
      charmBit = { A: 0, B: 0, C: 0 };
      received = [];
      flippedPos = -1;
      renderRig();
      updateStatus();
    }

    /* =================== HOOK (detect, first encounter) =================== */
    function renderHook() {
      phase = 'hook';
      wrap.innerHTML = '';
      wrap.appendChild(G.pz.hookCard({
        question: 'The storm flips at most ONE chip per crossing. With one extra charm — ' +
          'can you always CATCH a flip? Can you always FIND it?',
        options: [
          { label: 'Catch it and find it', note: 'one charm does both' },
          { label: 'Catch yes — find no', note: 'it knows THAT, not WHERE' },
          { label: 'Neither', note: 'one charm is too little' },
        ],
        correct: 1,
        reveal: 'One charm makes the lit count <b>even</b>. Any single flip turns it odd — ' +
          '<b>caught, every time</b>. But “odd” is a single yes/no answer: it can never point ' +
          'at a chip. <b>Found — never.</b> That gap is this whole island.',
        onDone: function () { newWindow(); },
      }));
    }

    /* =================== PHASE A: rig the charm =================== */
    function renderRig() {
      wrap.innerHTML = '';

      var rain = document.createElement('div');
      rain.className = 'pc-rain';
      if (mode === 'detect') {
        rain.innerHTML = taughtHere
          ? 'The strait again. Rig the charm <b>even</b>; call each arrival as it lands.'
          : 'Rain hisses on the rail. <b>Ada</b> sets the message; you set the one <b>charm</b> so the count of lit chips is <b>even</b>. One even charm survives any single flip in the storm.';
      } else {
        rain.innerHTML = taughtHere
          ? 'Three rings, your hands. Set every charm so <b>its</b> group is even.'
          : 'Three sisters, three charms. <b>Ada</b>, <b>Bea</b> and <b>Cee</b> each watch their own chips. Set every charm so <b>its</b> group is even — then a single flip cannot hide.';
      }
      wrap.appendChild(rain);

      var phaseLbl = document.createElement('div');
      phaseLbl.className = 'pc-phase';
      phaseLbl.textContent = 'Phase A · Rig the charm · crossing ' + (streak + 1) + ' / ' + totalTrips;
      wrap.appendChild(phaseLbl);

      if (mode === 'detect') renderDetectRig();
      else renderCorrectRig();
    }

    /* ---------- detect: message chips + one charm + (guided) parity meter ---------- */
    function renderDetectRig() {
      var card = document.createElement('div');
      card.className = 'g-card';

      var bits = document.createElement('div');
      bits.className = 'pc-bits';
      // message chips (read-only)
      for (var i = 0; i < k; i++) {
        bits.appendChild(makeChip(data[i], 'm' + (i + 1)));
      }
      // the single charm chip (clickable); on narrow screens it gets its own line
      bits.appendChild(lineBreak());
      var charm = makeCharmChip();
      bits.appendChild(charm);
      card.appendChild(bits);

      var meter = document.createElement('div');
      meter.className = 'pc-meter';
      card.appendChild(meter);

      var actions = document.createElement('div');
      actions.className = 'pc-actions';
      var send = document.createElement('button');
      send.className = 'btn btn-primary';
      send.textContent = 'Send across →';
      actions.appendChild(send);
      card.appendChild(actions);

      var fb = document.createElement('div');
      fb.className = 'pc-feedback';
      card.appendChild(fb);

      wrap.appendChild(card);

      function makeCharmChip() {
        var cell = document.createElement('div');
        cell.className = 'pc-cell';
        var c = document.createElement('div');
        function paint() {
          c.className = 'pc-chip pc-charm' + (detectBit ? ' pc-one' : '');
          c.textContent = detectBit;
        }
        c.setAttribute('role', 'button');
        c.tabIndex = 0;
        c.title = 'Toggle the charm';
        c.addEventListener('click', function () {
          detectBit ^= 1;
          api.sfx('select');
          paint();
          refreshMeter();
          fb.textContent = '';
        });
        paint();
        cell.appendChild(c);
        var lab = document.createElement('div');
        lab.className = 'pc-lab';
        lab.textContent = 'charm';
        cell.appendChild(lab);
        return cell;
      }

      function refreshMeter() {
        if (!guided()) {            // STRIP: the count is the player's job now
          meter.className = 'pc-meter pc-dimnote';
          meter.textContent = 'No meter out here — count the lit chips yourself.';
          return;
        }
        var all = data.concat([detectBit]);
        var n = countOnes(all);
        var even = (n & 1) === 0;
        meter.className = 'pc-meter';
        meter.innerHTML = '1s so far: <b>' + n + '</b> — ' +
          '<span class="' + (even ? 'pc-even' : 'pc-odd') + '">' + (even ? 'even ✓' : 'odd ✗') + '</span>';
      }
      refreshMeter();

      send.addEventListener('click', function () {
        // the charm MUST leave even, or arrival parity means nothing.
        if (!isEven(data.concat([detectBit]))) {
          api.sfx('bump');
          fb.className = 'pc-feedback pc-bad';
          fb.textContent = 'Ada catches your wrist: “Hold — count again. It must leave EVEN, or odd-at-arrival means nothing.”';
          return;
        }
        startCrossing();
      });
    }

    /* ---------- correct: Hamming charms with bracket groups ---------- */
    function renderCorrectRig() {
      if (guided() && pendingHint === 0) {
        wrap.appendChild(G.pz.coachCard('bea',
          'Three charms, three yes/no checks — <b>2³ = 8</b> patterns. Seven chips and ' +
          '“clean” is exactly eight. Set each group even; the storm gets one flip and nowhere to hide.'));
      }

      var card = document.createElement('div');
      card.className = 'g-card';

      // positions 1..4 = data, 5..7 = charm parity (A,B,C)
      var bits = document.createElement('div');
      bits.className = 'pc-bits';
      var posCells = {};
      for (var p = 1; p <= 7; p++) {
        var isData = p <= 4;
        var cell = document.createElement('div');
        cell.className = 'pc-cell';
        // colored brackets showing which charms watch this position
        var brk = document.createElement('div');
        brk.className = 'pc-brk';
        MEMBER[p].forEach(function (cn) {
          var bar = document.createElement('i');
          bar.style.background = CHARM_COLOR[cn];
          brk.appendChild(bar);
        });
        cell.appendChild(brk);
        var chip = document.createElement('div');
        chip.className = 'pc-chip';
        cell.appendChild(chip);
        var lab = document.createElement('div');
        lab.className = 'pc-lab';
        lab.textContent = isData ? ('d' + p) : ('p' + (p - 4));
        cell.appendChild(lab);
        bits.appendChild(cell);
        if (p === 4) bits.appendChild(lineBreak());
        posCells[p] = chip;
      }
      card.appendChild(bits);

      // charm cards (one per sister) with toggle buttons + nod indicator
      var charms = document.createElement('div');
      charms.className = 'pc-charms';
      var nodEls = {};
      CHARMS.forEach(function (cn) {
        var cc = document.createElement('div');
        cc.className = 'pc-charmcard';
        var name = document.createElement('div');
        name.className = 'pc-cname';
        name.style.color = CHARM_COLOR[cn];
        name.textContent = sisterName(cn) + ' (' + cn + ')';
        cc.appendChild(name);
        var watch = document.createElement('div');
        watch.className = 'pc-cwatch';
        watch.textContent = 'watches bits ' + DATA_OF[cn].join(', ');
        cc.appendChild(watch);
        var btn = document.createElement('button');
        btn.className = 'btn';
        btn.style.minHeight = '44px';
        btn.textContent = 'charm = ' + charmBit[cn];
        cc.appendChild(btn);
        var nod = document.createElement('div');
        nod.className = 'pc-nod pc-no';
        cc.appendChild(nod);
        charms.appendChild(cc);
        nodEls[cn] = { card: cc, nod: nod, btn: btn };
        btn.addEventListener('click', function () {
          charmBit[cn] ^= 1;
          api.sfx('select');
          btn.textContent = 'charm = ' + charmBit[cn];
          refresh();
          fb.textContent = '';
        });
      });
      card.appendChild(charms);

      var actions = document.createElement('div');
      actions.className = 'pc-actions';
      var send = document.createElement('button');
      send.className = 'btn btn-primary';
      send.textContent = 'Send across →';
      actions.appendChild(send);
      card.appendChild(actions);

      var fb = document.createElement('div');
      fb.className = 'pc-feedback';
      card.appendChild(fb);
      wrap.appendChild(card);

      function currentCode() {
        return [0, data[0], data[1], data[2], data[3], charmBit.A, charmBit.B, charmBit.C];
      }
      function refresh() {
        var code = currentCode();
        for (var p = 1; p <= 7; p++) {
          var v = code[p];
          posCells[p].textContent = v;
          posCells[p].className = 'pc-chip' + (v ? ' pc-one' : '');
        }
        // each charm's group even?
        var allGood = true;
        CHARMS.forEach(function (cn) {
          var sum = 0, ps = CHECK_OF[cn];
          for (var j = 0; j < ps.length; j++) sum += code[ps[j]];
          var even = (sum & 1) === 0;
          var e = nodEls[cn];
          e.card.className = 'pc-charmcard ' + (even ? 'pc-good' : 'pc-bad');
          e.nod.className = 'pc-nod ' + (even ? 'pc-ok' : 'pc-no');
          e.nod.textContent = even ? 'the sister nods ✓' : 'group still odd';
          if (!even) allGood = false;
        });
        return allGood;
      }
      refresh();

      send.addEventListener('click', function () {
        if (!refresh()) {
          api.sfx('bump');
          fb.className = 'pc-feedback pc-bad';
          fb.textContent = 'A sister won’t nod — her group is still odd. Every charm must make ITS group even before the boat goes.';
          return;
        }
        startCrossing();
      });
    }

    /* flex line-break (visible only ≤560px): splits data | parity rows */
    function lineBreak() {
      var b = document.createElement('i');
      b.className = 'pc-brkline';
      return b;
    }

    function makeChip(val, lab, mini) {
      var cell = document.createElement('div');
      cell.className = 'pc-cell';
      var c = document.createElement('div');
      c.className = 'pc-chip' + (mini ? ' pc-mini' : '') + (val ? ' pc-one' : '');
      c.textContent = val;
      cell.appendChild(c);
      if (lab) {
        var l = document.createElement('div');
        l.className = 'pc-lab';
        l.textContent = lab;
        cell.appendChild(l);
      }
      return cell;
    }

    /* =================== PHASE B: the crossing =================== */
    function startCrossing() {
      phase = 'cross';
      // build the codeword to send
      var code;
      if (mode === 'detect') {
        code = data.concat([detectBit]);              // 0-based, length k+1
      } else {
        code = [0, data[0], data[1], data[2], data[3], charmBit.A, charmBit.B, charmBit.C]; // 1-based 1..7
      }

      // the storm follows this window's schedule (trip index = current streak)
      var doFlip = !!schedule[Math.min(streak, schedule.length - 1)];
      flippedPos = -1;
      if (doFlip) {
        if (mode === 'detect') {
          flippedPos = Math.floor(api.rng() * (k + 1)); // 0..k
          code[flippedPos] ^= 1;
        } else {
          flippedPos = 1 + Math.floor(api.rng() * 7);   // 1..7
          code[flippedPos] ^= 1;
        }
      }
      received = code;

      // animate boat crossing, then reveal
      renderCrossing(function () { renderDeclare(); }, false);
    }

    /* the boat animation; the storm label NEVER says whether it flipped —
       reading the arrival is the player's job. */
    function renderCrossing(onArrive, twoFlips) {
      wrap.innerHTML = '';
      var rain = document.createElement('div');
      rain.className = 'pc-rain';
      rain.innerHTML = twoFlips ? 'Ada’s boat slides into a <b>worse</b> storm…' : 'The charm slides into the storm…';
      wrap.appendChild(rain);

      var lane = document.createElement('div');
      lane.className = 'pc-boatlane';
      var waves = document.createElement('div');
      waves.className = 'pc-waves';
      lane.appendChild(waves);
      var boat = document.createElement('div');
      boat.className = 'pc-boat';
      boat.textContent = '⛵';
      lane.appendChild(boat);
      var storm = document.createElement('div');
      storm.className = 'pc-storm';
      storm.textContent = '⛈ static strait';
      lane.appendChild(storm);
      wrap.appendChild(lane);

      api.sfx('sail');
      // glide the boat left -> right
      later(function () {
        boat.style.transition = 'left 1.15s ease-in-out';
        boat.style.left = 'calc(100% + 12px)';
      }, 30);
      // a crack of static at mid-crossing (deliberately uninformative)
      later(function () {
        api.sfx('zap');
        storm.textContent = twoFlips ? '⚡⚡ TWO strikes!' : '⚡ static crackles…';
      }, 640);
      if (twoFlips) later(function () { api.sfx('zap'); }, 840);
      later(onArrive, 1300);
    }

    /* =================== PHASE C: declare / decode =================== */
    function renderDeclare() {
      phase = 'declare';
      wrap.innerHTML = '';

      var phaseLbl = document.createElement('div');
      phaseLbl.className = 'pc-phase';
      phaseLbl.textContent = 'Arrival · ' + (mode === 'detect' ? 'declare the charm' : 'name the flip') +
        ' · crossing ' + (streak + 1) + ' / ' + totalTrips;
      wrap.appendChild(phaseLbl);

      if (mode === 'detect') renderDetectDeclare();
      else renderCorrectDeclare();
    }

    /* ---- mode-specific hint text for the current arrival ---- */
    function detectHintHtml(level) {
      var n = countOnes(received);
      var odd = (n & 1) === 1;
      if (level === 1) return 'Count the lit chips — charm included. <b>Even</b> count: clean. <b>Odd</b> count: the storm flipped one. With at most one flip, parity never lies.';
      if (level === 2) return 'This crossing arrived with <b>' + n + '</b> lit chips. Say it out loud: even, or odd?';
      return '<b>' + n + '</b> is ' + (odd ? '<b>odd</b> — a chip flipped. Press CORRUPTED.' : '<b>even</b> — nothing flipped. Press CLEAN.');
    }
    function correctHintHtml(level, odd, ans) {
      if (level === 1) return 'Which charms went odd? The flipped rune sits in <b>ALL</b> of them and <b>NONE</b> of the others.';
      if (level === 2) {
        if (ans === 0) return 'Every sister nods — no chip is named. What does the empty pattern mean?';
        var evens = [];
        for (var i = 0; i < CHARMS.length; i++) if (odd.indexOf(CHARMS[i]) < 0) evens.push(CHARMS[i]);
        return 'Find the chip watched by <b>' + sisterList(odd, ' AND ') + '</b>' +
          (evens.length ? ' — and NOT by ' + sisterList(evens, ' or ') : '') + '. Only one chip fits.';
      }
      if (ans === 0) return 'Nothing flipped this time — press <b>All clean</b>.';
      return 'It’s chip <b>' + posLabel(ans) + '</b> — the one under ' + sisterList(odd, '’s and ') +
        '’s bars and no one else’s. Press it.';
    }

    function renderDetectDeclare() {
      var card = document.createElement('div');
      card.className = 'g-card';

      var bits = document.createElement('div');
      bits.className = 'pc-bits';
      for (var i = 0; i < k; i++) bits.appendChild(makeChip(received[i], 'm' + (i + 1)));
      bits.appendChild(lineBreak());
      bits.appendChild(makeChip(received[k], 'charm'));
      card.appendChild(bits);

      // GUIDE round shows the parity readout; STRIP rounds make counting the job
      var meter = document.createElement('div');
      if (guided()) {
        var even0 = isEven(received);
        meter.className = 'pc-meter';
        meter.innerHTML = 'Arrived 1s: <b>' + countOnes(received) + '</b> — ' +
          '<span class="' + (even0 ? 'pc-even' : 'pc-odd') + '">' + (even0 ? 'parity even' : 'parity odd') + '</span>';
      } else {
        meter.className = 'pc-meter pc-dimnote';
        meter.textContent = 'Count the lit chips. Even or odd?';
      }
      card.appendChild(meter);

      var actions = document.createElement('div');
      actions.className = 'pc-actions';
      var clean = document.createElement('button');
      clean.className = 'btn';
      clean.textContent = 'CLEAN';
      var corrupt = document.createElement('button');
      corrupt.className = 'btn';
      corrupt.textContent = 'CORRUPTED';
      actions.appendChild(clean);
      actions.appendChild(corrupt);
      card.appendChild(actions);

      var fb = document.createElement('div');
      fb.className = 'pc-feedback';
      card.appendChild(fb);
      wrap.appendChild(card);

      // coach: hint after failures, else the principle line on the guided round
      if (pendingHint > 0) {
        wrap.appendChild(G.pz.coachCard('ada', detectHintHtml(pendingHint)));
      } else if (guided()) {
        wrap.appendChild(G.pz.coachCard('ada',
          'Count what arrived. Odd means the storm touched a chip — <b>caught, every time</b>. ' +
          'But notice: odd can’t say <b>which</b>. One charm catches; it never finds.'));
      }
      wrap.appendChild(progressLine());

      // truth = what actually happened (the rig phase guarantees an even send)
      var truthCorrupted = flippedPos >= 0;
      function answer(saysCorrupt) {
        clean.disabled = corrupt.disabled = true;
        if (declareOutcome(truthCorrupted, saysCorrupt) === 'win') {
          fb.className = 'pc-feedback pc-good';
          fb.textContent = 'Right. ' + (truthCorrupted
            ? 'The count came in odd — the storm flipped a bit.'
            : 'The count held even — it crossed clean.');
          api.sfx('select');
          tripWon();
        } else {
          fb.className = 'pc-feedback pc-bad';
          fb.textContent = (truthCorrupted
            ? 'The count came in ODD — a bit DID flip.'
            : 'The count is EVEN — it crossed clean.') +
            ' The streak resets; Ada only counts crossings you call right in a row.';
          api.fail();
          tripLost();
        }
      }
      clean.addEventListener('click', function () { answer(false); });
      corrupt.addEventListener('click', function () { answer(true); });
    }

    function renderCorrectDeclare() {
      var card = document.createElement('div');
      card.className = 'g-card';

      // the three charm checks light red/green — the rings ARE the instrument
      var odd = syndrome(received);
      var ans = positionFromSyndrome(odd);
      var rings = document.createElement('div');
      rings.className = 'pc-actions';
      CHARMS.forEach(function (cn) {
        var isOdd = odd.indexOf(cn) >= 0;
        var pill = document.createElement('span');
        pill.className = 'pc-ring ' + (isOdd ? 'pc-rred' : 'pc-rgreen');
        pill.style.color = CHARM_COLOR[cn];
        pill.textContent = sisterName(cn) + ' ' + (isOdd ? 'ODD' : 'even');
        rings.appendChild(pill);
      });
      card.appendChild(rings);

      // clickable arrived bits 1..7
      var bits = document.createElement('div');
      bits.className = 'pc-bits';
      var chips = {};
      for (var p = 1; p <= 7; p++) {
        (function (pos) {
          var cell = document.createElement('div');
          cell.className = 'pc-cell';
          var brk = document.createElement('div');
          brk.className = 'pc-brk';
          MEMBER[pos].forEach(function (cn) {
            var bar = document.createElement('i');
            bar.style.background = CHARM_COLOR[cn];
            brk.appendChild(bar);
          });
          cell.appendChild(brk);
          var chip = document.createElement('div');
          chip.className = 'pc-chip pc-pick';
          chip.textContent = received[pos];
          chip.addEventListener('click', function () { pick(pos); });
          cell.appendChild(chip);
          var lab = document.createElement('div');
          lab.className = 'pc-lab';
          lab.textContent = posLabel(pos);
          cell.appendChild(lab);
          bits.appendChild(cell);
          if (pos === 4) bits.appendChild(lineBreak());
          chips[pos] = chip;
        })(p);
      }
      card.appendChild(bits);

      // GUIDE: first round spells the syndrome out in ring-words.
      // STRIP: later rounds just light the rings.
      var hint = document.createElement('div');
      if (guided()) {
        hint.className = 'pc-meter';
        if (odd.length === 0) {
          hint.innerHTML = 'All three sisters nod — that pattern means <span class="pc-even">no flip at all</span>.';
        } else {
          var evens = [];
          for (var i = 0; i < CHARMS.length; i++) if (odd.indexOf(CHARMS[i]) < 0) evens.push(CHARMS[i]);
          hint.innerHTML = nameList(odd, true) + (odd.length > 1 ? ' frown' : ' frowns') +
            (evens.length ? '; ' + nameList(evens, true) + (evens.length > 1 ? ' nod' : ' nods') + '.' : ' — all three.') +
            ' The flipped chip sits in ' + (odd.length > 1 ? 'EVERY frowning group' : 'the frowning group') +
            (evens.length ? ' and in NO nodding group' : '') + '. Only one chip does.';
        }
      } else {
        hint.className = 'pc-meter pc-dimnote';
        hint.textContent = 'First tap = your answer. A guess resets the crossing.';
      }
      card.appendChild(hint);

      var actions = document.createElement('div');
      actions.className = 'pc-actions';
      var allclean = document.createElement('button');
      allclean.className = 'btn';
      allclean.textContent = 'All clean';
      actions.appendChild(allclean);
      card.appendChild(actions);

      var fb = document.createElement('div');
      fb.className = 'pc-feedback';
      card.appendChild(fb);
      wrap.appendChild(card);

      // coach: escalating hints after failures; first-round rule otherwise
      if (pendingHint > 0) {
        wrap.appendChild(G.pz.coachCard('bea', correctHintHtml(pendingHint, odd, ans)));
        if (pendingHint >= 3 && ans > 0) chips[ans].classList.add('pc-hintglow');
      } else if (guided()) {
        wrap.appendChild(G.pz.coachCard('bea',
          'Read the rings <b>before</b> you touch — your first tap is the answer. ' +
          'A guess resets the crossing with a fresh flip.'));
      }
      wrap.appendChild(progressLine());

      var answered = false;
      function lockAll() {
        answered = true;
        allclean.disabled = true;
        for (var p = 1; p <= 7; p++) chips[p].className = 'pc-chip';
      }
      /* NO-GUESSING GATE: the first chip tapped must BE the named flip. */
      function pick(pos) {
        if (answered) return;
        if (pickOutcome(ans, pos) === 'win') {
          lockAll();
          chips[pos].className = 'pc-chip pc-flipd';
          fb.className = 'pc-feedback pc-good';
          fb.textContent = 'Got it — chip ' + posLabel(pos) + ' was the flip. The rings named it alone.';
          api.sfx('select');
          tripWon();
        } else {
          lockAll();
          fb.className = 'pc-feedback pc-bad';
          fb.textContent = (ans === 0
            ? 'All three sisters nodded — nothing flipped, and you tapped anyway.'
            : 'Not that one.') +
            ' A guess costs the round: fresh flip, streak back to zero.';
          api.fail();
          tripLost();
        }
      }
      allclean.addEventListener('click', function () {
        if (answered) return;
        if (cleanOutcome(ans) === 'win') {
          lockAll();
          fb.className = 'pc-feedback pc-good';
          fb.textContent = 'Right — every sister nodded, the message crossed clean.';
          api.sfx('select');
          tripWon();
        } else {
          lockAll();
          fb.className = 'pc-feedback pc-bad';
          fb.textContent = 'A sister is red — something flipped. A guess costs the round: fresh flip, streak back to zero.';
          api.fail();
          tripLost();
        }
      });
    }

    function progressLine() {
      var p = document.createElement('div');
      p.className = 'pc-prog';
      var dots = '';
      for (var i = 0; i < totalTrips; i++) dots += (i < streak ? '◉ ' : '○ ');
      p.innerHTML = 'In a row: ' + dots.trim();
      return p;
    }

    /* ---- trip resolution ---- */
    function tripWon() {
      ladder.reset();
      pendingHint = 0;
      streak = streakAfter(streak, true);
      updateStatus();
      if (streak >= totalTrips) {
        // gate met: first detect completion gets the two-flip demonstration
        if (mode === 'detect' && !taughtHere) later(startDemo, 900);
        else later(showDebrief, 900);
      } else {
        later(newTrip, 950);
      }
    }
    function tripLost() {
      // the no-guessing rule: streak resets, fresh randomness, escalate hints
      streak = streakAfter(streak, false);
      var h = ladder.fail();
      pendingHint = h ? parseInt(h, 10) : 0;
      updateStatus();
      later(newWindow, 1500);
    }

    /* ============ THE TWO-FLIP DEMONSTRATION (detect, first completion) ============
       Scripted, no fail state: the storm flips TWO message chips; the parity
       check passes; the delivered message is visibly wrong; Ada names the gap. */
    function startDemo() {
      clearTimers();
      phase = 'demo';
      api.status('A demonstration &middot; detect mode');
      var ddata = [];
      for (var i = 0; i < k; i++) ddata.push(api.rng() < 0.5 ? 0 : 1);
      var sent = ddata.concat([detectCharm(ddata)]);
      // flip TWO distinct MESSAGE chips (the delivered words go wrong)
      var f1 = Math.floor(api.rng() * k);
      var f2 = Math.floor(api.rng() * (k - 1));
      if (f2 >= f1) f2++;
      var recv = sent.slice();
      recv[f1] ^= 1;
      recv[f2] ^= 1;
      demo = { sent: sent, recv: recv, flips: [f1, f2] };
      renderDemoIntro();
    }

    function renderDemoIntro() {
      wrap.innerHTML = '';
      var rain = document.createElement('div');
      rain.className = 'pc-rain';
      rain.innerHTML = 'Ada holds the rail before you can celebrate. “One more crossing — <b>mine</b>. The storm is worse tonight. Watch what one charm cannot do.”';
      wrap.appendChild(rain);

      var phaseLbl = document.createElement('div');
      phaseLbl.className = 'pc-phase';
      phaseLbl.textContent = 'Demonstration · Ada’s crossing';
      wrap.appendChild(phaseLbl);

      var card = document.createElement('div');
      card.className = 'g-card';
      var bits = document.createElement('div');
      bits.className = 'pc-bits';
      for (var i = 0; i <= k; i++) bits.appendChild(makeChip(demo.sent[i], i < k ? ('m' + (i + 1)) : 'charm'));
      card.appendChild(bits);
      var meter = document.createElement('div');
      meter.className = 'pc-meter';
      meter.innerHTML = 'Ada rigs it herself: <b>' + countOnes(demo.sent) + '</b> lit — <span class="pc-even">even ✓</span>';
      card.appendChild(meter);
      var actions = document.createElement('div');
      actions.className = 'pc-actions';
      var go = document.createElement('button');
      go.className = 'btn btn-primary';
      go.textContent = 'Watch the crossing →';
      go.addEventListener('click', function () {
        renderCrossing(function () { renderDemoArrival(); }, true);
      });
      actions.appendChild(go);
      card.appendChild(actions);
      wrap.appendChild(card);
    }

    function renderDemoArrival() {
      phase = 'demo';
      wrap.innerHTML = '';
      var phaseLbl = document.createElement('div');
      phaseLbl.className = 'pc-phase';
      phaseLbl.textContent = 'Demonstration · two flips';
      wrap.appendChild(phaseLbl);

      var card = document.createElement('div');
      card.className = 'g-card';

      var cmp = document.createElement('div');
      cmp.className = 'pc-cmp';
      cmp.appendChild(demoRow('sent', demo.sent, []));
      cmp.appendChild(demoRow('arrived', demo.recv, demo.flips));
      card.appendChild(cmp);

      var meter = document.createElement('div');
      meter.className = 'pc-meter';
      meter.innerHTML = 'Arrived 1s: <b>' + countOnes(demo.recv) + '</b> — ' +
        '<span class="pc-even">parity even ✓</span> &nbsp;·&nbsp; the charm calls it <b>CLEAN</b>.';
      card.appendChild(meter);

      var fb = document.createElement('div');
      fb.className = 'pc-feedback pc-bad';
      fb.textContent = 'But look at the chips — two flipped, and the message arrived wrong.';
      card.appendChild(fb);
      wrap.appendChild(card);

      wrap.appendChild(G.pz.coachCard('ada',
        '“<b>Even errors slip past an even-counter.</b> Two flips cancel — the charm never blinks. ' +
        'Remember the feeling.”'));

      var actions = document.createElement('div');
      actions.className = 'pc-actions';
      var go = document.createElement('button');
      go.className = 'btn btn-primary';
      go.textContent = 'Continue →';
      go.addEventListener('click', function () { showDebrief(); });
      actions.appendChild(go);
      wrap.appendChild(actions);
    }

    function demoRow(label, bitsArr, marks) {
      var row = document.createElement('div');
      row.className = 'pc-cmprow';
      var lab = document.createElement('span');
      lab.className = 'pc-cmplab';
      lab.textContent = label;
      row.appendChild(lab);
      for (var i = 0; i < bitsArr.length; i++) {
        var c = document.createElement('div');
        c.className = 'pc-chip pc-mini' + (bitsArr[i] ? ' pc-one' : '') +
          (marks.indexOf(i) >= 0 ? ' pc-flipd' : '');
        c.textContent = bitsArr[i];
        row.appendChild(c);
      }
      return row;
    }

    /* =================== DEBRIEF + complete =================== */
    function showDebrief() {
      clearTimers();
      phase = 'debrief';
      wrap.innerHTML = '';
      var opts;
      if (mode === 'detect') {
        opts = {
          title: 'One charm: catch, not find',
          tone: 'win',
          html: 'Across your <b>' + totalTrips + '</b> straight crossings the one even charm caught ' +
            'every single flip — odd count, every time. <b>Catch: always.</b> But one charm is one ' +
            'yes/no answer — <span class="pzk-eq">1 bit</span> — enough to split clean from corrupted, ' +
            'nowhere near the <span class="pzk-eq">log₂ ' + (k + 2) + ' ≈ ' +
            G.pz.fmt(G.pz.log2(k + 2), 1) + ' bits</span> it would take to also name which of the ' +
            (k + 1) + ' chips (or “clean”). <b>Find: never.</b> And you just watched two flips cancel ' +
            'back to even and stroll past. Finding — and surviving the pair — takes more charms: ' +
            'the sisters up the boardwalk keep three.',
        };
      } else {
        opts = {
          title: 'Three checks, eight answers',
          tone: 'win',
          html: 'The table you have been reading, written out:' + synTableHtml() +
            '<p style="margin:.5rem 0 0"><b>3 checks, 8 patterns: 7 positions + clean.</b> ' +
            '<span class="pzk-eq">2³ = 8 = 7 + 1</span> — exactly enough, not a charm wasted. ' +
            'That is Hamming(7,4): four message bits, three overlapping parities, and every single ' +
            'flip is not just caught but <b>named</b> — and undone.</p>',
        };
      }
      opts.buttonLabel = 'The sisters wave you on →';
      opts.onButton = doComplete;
      wrap.appendChild(G.pz.debriefCard(opts));
    }

    function doComplete() {
      if (finished) return;
      finished = true;
      clearTimers();
      G.pz.markTaught(taughtKey);
      api.complete();
    }

    /* ---- go ---- */
    if (mode === 'detect' && !taughtHere) renderHook();
    else newWindow();
    updateStatus();

    return {
      destroy: function () { clearTimers(); }
    };
  }
});

})();
