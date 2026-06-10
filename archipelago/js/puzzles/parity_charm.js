/* THE QUIET ARCHIPELAGO — puzzle mechanic: 'parity-charm'
   The Parity Sisters' crossing charms (Static Strait).
   Config: { dataBits:k, mode:'detect'|'correct', trips:t }
   - detect: one parity charm; player sets it so total #1s is even; storm flips
     <=1 bit; player declares CLEAN / CORRUPTED.
   - correct: k=4 with 3 charms wired as Hamming(7,4); each charm watches a group;
     player sets each so ITS group is even; storm flips <=1 bit; player clicks the
     flipped bit (or "all clean") — the syndrome names it.
   Contract: ../../DESIGN.md (schema 7). complete() exactly once; never binds Esc;
   destroy() clears timers; clean re-create. */
(function () {
'use strict';

/* ============================ pure logic ============================ */
/* (exhaustively verified in a scratch node test: detect catches every single
   flip in the k+1 codeword; Hamming(7,4) gives a unique syndrome per single
   flip and the symmetric difference for two flips.) */

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
  '.pc-lab{font-size:.62rem;color:var(--dim);letter-spacing:.05em}' +
  '.pc-meter{text-align:center;font-size:.92rem}' +
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
  '.pc-lesson{border-left:3px solid var(--green)}' +
  '.pc-lesson h4{color:var(--green);margin-bottom:.4rem;font-size:.95rem}' +
  '.pc-lesson p{font-size:.85rem;line-height:1.55;color:var(--text)}' +
  '@media (max-width:560px){.pc-charmcard{flex-basis:46%}}';
  document.head.appendChild(s);
}

/* charm color per name (matches venn-lock ring colors) */
var CHARM_COLOR = { A: 'var(--red)', B: 'var(--green)', C: 'var(--blue)' };

/* ============================ mechanic ============================ */
G.puzzles.register('parity-charm', {
  title: 'The Parity Sisters’ Charm',
  create: function (root, config, api) {
    injectStyle();

    var k = Math.max(1, (config && config.dataBits) || 4);
    var mode = (config && config.mode) === 'correct' ? 'correct' : 'detect';
    var totalTrips = Math.max(1, (config && config.trips) || 3);
    /* correct mode is wired specifically as Hamming(7,4): force k=4. */
    if (mode === 'correct') k = 4;

    var trips = 0;
    var timers = [];          // animation timeouts to clear on destroy
    var finished = false;     // guards complete()
    var phase = 'rig';        // 'rig' | 'cross' | 'declare'

    /* per-trip state */
    var data = [];            // k message bits
    var detectBit = 0;        // detect-mode charm value (player-set)
    var charmBit = { A: 0, B: 0, C: 0 }; // correct-mode charm values
    var received = [];        // bits as they arrived (1-based for correct, 0-based array for detect)
    var flippedPos = -1;      // which position the storm flipped (-1 none); correct=1..7, detect=0..k

    var wrap = document.createElement('div');
    wrap.className = 'pc-wrap';
    root.appendChild(wrap);

    function clearTimers() {
      for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
      timers = [];
    }
    function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }

    function updateStatus() {
      var modeWord = mode === 'detect' ? 'detect' : 'correct';
      api.status('Clean crossings: <b style="color:var(--green)">' + trips + '</b> / ' + totalTrips +
        ' &middot; ' + modeWord + ' mode');
    }

    /* ---- new trip: fresh random message ---- */
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

    /* =================== PHASE A: rig the charm =================== */
    function renderRig() {
      wrap.innerHTML = '';

      var rain = document.createElement('div');
      rain.className = 'pc-rain';
      rain.innerHTML = mode === 'detect'
        ? 'Rain hisses on the rail. <b>Ada</b> sets the message; you set the one <b>charm</b> so the count of lit chips is <b>even</b>. One even charm survives any single flip in the storm.'
        : 'Three sisters, three charms. <b>Ada</b>, <b>Bea</b> and <b>Cee</b> each watch their own chips. Set every charm so <b>its</b> group is even — then a single flip cannot hide.';
      wrap.appendChild(rain);

      var phaseLbl = document.createElement('div');
      phaseLbl.className = 'pc-phase';
      phaseLbl.textContent = 'Phase A · Rig the charm';
      wrap.appendChild(phaseLbl);

      if (mode === 'detect') renderDetectRig();
      else renderCorrectRig();
    }

    /* ---------- detect: message chips + one charm + parity meter ---------- */
    function renderDetectRig() {
      var card = document.createElement('div');
      card.className = 'g-card';

      var bits = document.createElement('div');
      bits.className = 'pc-bits';
      // message chips (read-only)
      for (var i = 0; i < k; i++) {
        bits.appendChild(makeChip(data[i], false, 'm' + (i + 1)));
      }
      // the single charm chip (clickable)
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

      wrap.appendChild(card);

      function makeCharmChip() {
        var c = document.createElement('div');
        var cell = document.createElement('div');
        cell.className = 'pc-cell';
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
        var all = data.concat([detectBit]);
        var n = countOnes(all);
        var even = (n & 1) === 0;
        meter.innerHTML = '1s so far: <b>' + n + '</b> — ' +
          '<span class="' + (even ? 'pc-even' : 'pc-odd') + '">' + (even ? 'even ✓' : 'odd ✗') + '</span>';
        send.disabled = false; // never softlock; sending an odd charm just fails the call honestly
      }
      refreshMeter();

      send.addEventListener('click', function () {
        startCrossing();
      });
    }

    /* ---------- correct: Hamming charms with bracket groups ---------- */
    function renderCorrectRig() {
      var card = document.createElement('div');
      card.className = 'g-card';

      // build the 7-position code from data + current charm bits, for bracket display
      var bits = document.createElement('div');
      bits.className = 'pc-bits';
      // positions 1..4 = data, 5..7 = charm parity (A,B,C)
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
        posCells[p] = chip;
      }
      card.appendChild(bits);

      // charm cards (one per sister) with set-to-even buttons + nod indicator
      var charms = document.createElement('div');
      charms.className = 'pc-charms';
      var nodEls = {};
      CHARMS.forEach(function (cn) {
        var cc = document.createElement('div');
        cc.className = 'pc-charmcard';
        var name = document.createElement('div');
        name.className = 'pc-cname';
        name.style.color = CHARM_COLOR[cn];
        name.textContent = (cn === 'A' ? 'Ada' : cn === 'B' ? 'Bea' : 'Cee') + ' (' + cn + ')';
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
      wrap.appendChild(card);

      function currentCode() {
        var code = [0, data[0], data[1], data[2], data[3], charmBit.A, charmBit.B, charmBit.C];
        return code;
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
        send.disabled = false; // never softlock
        return allGood;
      }
      refresh();

      send.addEventListener('click', function () { startCrossing(); });
    }

    function makeChip(val, clickable, lab) {
      var cell = document.createElement('div');
      cell.className = 'pc-cell';
      var c = document.createElement('div');
      c.className = 'pc-chip' + (val ? ' pc-one' : '');
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

      // storm flips 0 or 1 bits (50/50)
      var doFlip = api.rng() < 0.5;
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
      renderCrossing();
    }

    function renderCrossing() {
      wrap.innerHTML = '';
      var rain = document.createElement('div');
      rain.className = 'pc-rain';
      rain.innerHTML = 'The charm slides into the storm…';
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
      // a crack of static at mid-crossing
      later(function () {
        api.sfx('zap');
        storm.textContent = flippedPos >= 0 ? '⚡ a flip!' : '⛈ clear-ish';
      }, 640);
      // arrival -> declare phase
      later(function () { renderDeclare(); }, 1300);
    }

    /* =================== PHASE C: declare / decode =================== */
    function renderDeclare() {
      phase = 'declare';
      wrap.innerHTML = '';

      var phaseLbl = document.createElement('div');
      phaseLbl.className = 'pc-phase';
      phaseLbl.textContent = 'Arrival · ' + (mode === 'detect' ? 'declare the charm' : 'name the flip');
      wrap.appendChild(phaseLbl);

      if (mode === 'detect') renderDetectDeclare();
      else renderCorrectDeclare();
    }

    function renderDetectDeclare() {
      var card = document.createElement('div');
      card.className = 'g-card';

      var bits = document.createElement('div');
      bits.className = 'pc-bits';
      for (var i = 0; i < k; i++) bits.appendChild(makeChip(received[i], false, 'm' + (i + 1)));
      bits.appendChild(makeChip(received[k], false, 'charm'));
      card.appendChild(bits);

      // parity readout the player reasons from
      var even = isEven(received);
      var meter = document.createElement('div');
      meter.className = 'pc-meter';
      meter.innerHTML = 'Arrived 1s: <b>' + countOnes(received) + '</b> — ' +
        '<span class="' + (even ? 'pc-even' : 'pc-odd') + '">' + (even ? 'parity even' : 'parity odd') + '</span>';
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
      wrap.appendChild(progressLine());

      // truth: with a correctly-rigged even charm, parity-odd <=> a flip happened.
      // (and with <=1 flip the two never disagree — that is the lesson.)
      var truthCorrupted = !even;
      function answer(saysCorrupt) {
        clean.disabled = corrupt.disabled = true;
        if (saysCorrupt === truthCorrupted) {
          fb.className = 'pc-feedback pc-good';
          fb.textContent = 'Right. ' + (truthCorrupted
            ? 'Parity is odd — the storm flipped a bit.'
            : 'Parity holds even — nothing flipped.');
          api.sfx('select');
          tripWon();
        } else {
          fb.className = 'pc-feedback pc-bad';
          fb.textContent = (truthCorrupted
            ? 'Look again — the count came in odd, so a bit DID flip.'
            : 'Look again — the count is even, so it crossed clean.') +
            ' Ada waits; try the trip once more.';
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

      // the three charm checks light red/green
      var odd = syndrome(received);
      var rings = document.createElement('div');
      rings.className = 'pc-actions';
      CHARMS.forEach(function (cn) {
        var isOdd = odd.indexOf(cn) >= 0;
        var pill = document.createElement('span');
        pill.className = 'pc-ring ' + (isOdd ? 'pc-rred' : 'pc-rgreen');
        pill.style.color = CHARM_COLOR[cn];
        pill.textContent = (cn === 'A' ? 'Ada' : cn === 'B' ? 'Bea' : 'Cee') + ' ' + (isOdd ? 'ODD' : 'even');
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
          lab.textContent = pos <= 4 ? ('d' + pos) : ('p' + (pos - 4));
          cell.appendChild(lab);
          bits.appendChild(cell);
          chips[pos] = chip;
        })(p);
      }
      card.appendChild(bits);

      var hint = document.createElement('div');
      hint.className = 'pc-meter';
      var ans = positionFromSyndrome(odd);
      hint.innerHTML = odd.length === 0
        ? 'All three sisters nod — <span class="pc-even">no flip</span>.'
        : 'Odd: <b>' + odd.map(function (c) { return c === 'A' ? 'Ada' : c === 'B' ? 'Bea' : 'Cee'; }).join(' · ') +
          '</b> — the brackets point at exactly one chip.';
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
      wrap.appendChild(progressLine());

      var answered = false;
      function lockAll() {
        answered = true;
        allclean.disabled = true;
        for (var p = 1; p <= 7; p++) chips[p].className = 'pc-chip';
      }
      function pick(pos) {
        if (answered) return;
        // correct answer: ans (0 = clean, else the flipped position)
        if (ans !== 0 && pos === ans) {
          lockAll();
          chips[pos].className = 'pc-chip pc-flipd';
          fb.className = 'pc-feedback pc-good';
          fb.textContent = 'Got it — chip ' + pos + ' was the flip. The brackets named it alone.';
          api.sfx('select');
          tripWon();
        } else {
          // wrong pick
          if (!answered) {
            fb.className = 'pc-feedback pc-bad';
            fb.textContent = ans === 0
              ? 'But all three sisters nodded — nothing flipped. Try “All clean”.'
              : 'Not that one. Read the red sisters’ brackets — they overlap on a single chip.';
            api.fail();
            lockAll();
            tripLost();
          }
        }
      }
      allclean.addEventListener('click', function () {
        if (answered) return;
        if (ans === 0) {
          lockAll();
          fb.className = 'pc-feedback pc-good';
          fb.textContent = 'Right — every sister nodded, the message crossed clean.';
          api.sfx('select');
          tripWon();
        } else {
          fb.className = 'pc-feedback pc-bad';
          fb.textContent = 'A sister is red — something flipped. Find the chip her brackets share.';
          api.fail();
          lockAll();
          tripLost();
        }
      });
    }

    function progressLine() {
      var p = document.createElement('div');
      p.className = 'pc-prog';
      var dots = '';
      for (var i = 0; i < totalTrips; i++) dots += (i < trips ? '◉ ' : '○ ');
      p.innerHTML = 'Crossings: ' + dots.trim();
      return p;
    }

    /* ---- trip resolution ---- */
    function tripWon() {
      trips++;
      updateStatus();
      if (trips >= totalTrips) {
        later(showLesson, 750);
      } else {
        later(newTrip, 950);
      }
    }
    function tripLost() {
      // gentle retry — the SAME trip repeats with a fresh message.
      later(newTrip, 1400);
    }

    /* ---- lesson card + complete ---- */
    function showLesson() {
      clearTimers();
      wrap.innerHTML = '';
      var card = document.createElement('div');
      card.className = 'g-card pc-lesson';
      var h = document.createElement('h4');
      h.textContent = mode === 'detect' ? 'One charm, one flip' : 'Three charms, one culprit';
      card.appendChild(h);
      var p = document.createElement('p');
      if (mode === 'detect') {
        p.innerHTML = 'One parity bit makes the whole message even, so <b>any single flip</b> turns it ' +
          'odd — caught every time. But it can’t say <b>where</b> the flip was, and <b>two</b> ' +
          'flips cancel back to even and slip past clean. (With ≤1 flip, parity and the truth never ' +
          'disagree — odd means a flip, even means none.)';
      } else {
        p.innerHTML = 'Three overlapping parities point straight at the culprit. Each charm is one ' +
          'yes/no check, so 3 checks distinguish <b>2³ = 8</b> cases — the 7 chip positions ' +
          '<b>plus</b> “all clean.” That is exactly Hamming(7,4): four data bits, three charms, ' +
          'every single flip corrected.';
      }
      card.appendChild(p);

      var btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.style.minHeight = '44px';
      btn.textContent = 'The sisters wave you on →';
      btn.addEventListener('click', doComplete);
      card.appendChild(btn);
      wrap.appendChild(card);
    }

    function doComplete() {
      if (finished) return;
      finished = true;
      clearTimers();
      api.complete();
    }

    /* ---- go ---- */
    newTrip();

    return {
      destroy: function () { clearTimers(); }
    };
  }
});

})();
