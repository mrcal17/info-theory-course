/* SIGNAL LOST — 04 Uplink (noisy-uplink).
   Rate vs reliability on a binary symmetric channel (BSC).
   Push 7 packets x 4 data bits (28 bits) through a BSC under a channel-use
   budget. Per packet, choose RAW / HAMMING(7,4) / REPEAT x3; each scheme's
   P_ok for the current p is shown live so the choice is an expected-value bet.
   Contract: see ../DESIGN.md. Single-file IIFE, no globals but Game.register. */
(function () {
'use strict';

/* ============================ pure math ============================ */
/* Binary entropy, capacity, and the per-scheme survival probabilities.
   These are the teaching surface — kept pure and free of DOM/state. */

function h2(p) {                       // H2(p) in bits
  if (p <= 0 || p >= 1) return 0;
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
}
function capacity(p) {                 // C = 1 - H2(p)  (bits per channel use)
  return 1 - h2(p);
}
function shannonFloorUses(bits, p) {   // fewest uses to carry `bits` on average
  return bits / capacity(p);
}

/* RAW: 4 channel uses, survives iff zero flips. */
function pOkRaw(p) { return Math.pow(1 - p, 4); }

/* HAMMING(7,4): 7 uses, corrects any single flip in the 7-bit block. */
function pOkHam(p) { return Math.pow(1 - p, 7) + 7 * p * Math.pow(1 - p, 6); }

/* REPEAT x3: each of 4 data bits sent 3x, majority vote.
   bit ok with prob (1-p)^3 + 3 p (1-p)^2 ; packet ok = that^4. */
function pBitR3(p) { return Math.pow(1 - p, 3) + 3 * p * Math.pow(1 - p, 2); }
function pOkR3(p) { return Math.pow(pBitR3(p), 4); }

/* Per-scheme channel-use costs (uses spent per attempt). */
var COST = { raw: 4, ham: 7, r3: 12 };

/* Static scheme metadata; pOk wired below so we never duplicate a formula. */
var SCHEMES = [
  { key: 'raw', name: 'RAW',          cost: COST.raw, pOk: pOkRaw, blurb: '4 uses · survives only with zero flips' },
  { key: 'ham', name: 'HAMMING(7,4)', cost: COST.ham, pOk: pOkHam, blurb: '7 uses · fixes any single flip' },
  { key: 'r3',  name: 'REPEAT×3',     cost: COST.r3,  pOk: pOkR3,  blurb: '12 uses · 3× send, majority vote' },
];

/* Missions: crossover p and a channel-use budget. Budgets ~2.2x the Shannon
   floor (28 bits): floors are 33 / 47 / 72 uses -> 72 / 103 / 158. Generous
   enough that sensible play clears ~90%+, tight enough that careless
   re-spending bites at p=0.15. */
var MISSIONS = [
  { p: 0.02, budget: 72  },
  { p: 0.08, budget: 103 },
  { p: 0.15, budget: 158 },
];

var DATA_BITS = 28;     // 7 packets x 4 data bits
var PKT_BITS = 4;
var NUM_PKTS = 7;

function fmtPct(x) { return (100 * x).toFixed(1) + '%'; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* Hamming(7,4) generator: data bits d (length 4) -> 7-bit codeword.
   Layout positions 1..7 (1-indexed): p1 p2 d1 p3 d2 d3 d4.
   We only need it to render a plausible block and to detect/correct one flip,
   so we compute parities from the data and decode by syndrome. */
function hammingEncode(d) {            // d: [d1,d2,d3,d4] of 0/1 -> [7]
  var d1 = d[0], d2 = d[1], d3 = d[2], d4 = d[3];
  var p1 = d1 ^ d2 ^ d4;
  var p2 = d1 ^ d3 ^ d4;
  var p3 = d2 ^ d3 ^ d4;
  return [p1, p2, d1, p3, d2, d3, d4];  // positions 1..7
}
function hammingSyndrome(c) {          // c: [7] -> error position 0 (none) or 1..7
  // recompute the three parity checks over received bits
  var s1 = c[0] ^ c[2] ^ c[4] ^ c[6];  // p1 d1 d2 d4  (pos 1,3,5,7)
  var s2 = c[1] ^ c[2] ^ c[5] ^ c[6];  // p2 d1 d3 d4  (pos 2,3,6,7)
  var s3 = c[3] ^ c[4] ^ c[5] ^ c[6];  // p3 d2 d3 d4  (pos 4,5,6,7)
  return s1 * 1 + s2 * 2 + s3 * 4;     // standard Hamming syndrome -> position
}

/* ============================ game ============================ */

Game.register({
  id: 'noisy-uplink',
  title: 'Uplink',
  icon: '📡',
  part: 3,
  module: '3A',
  moduleTitle: 'Channel Capacity',
  moduleUrl: '../3a_channel_capacity/',
  tagline: 'Buy reliability with redundancy and pay for it in channel uses.',

  briefing:
    '<p>A storm sits between you and the relay, flipping bits at random. ' +
    'The dish gets a fixed number of channel uses per mission — spend them well ' +
    'and 28 bits get through; spend them badly and the link dies mid-burst.</p>' +
    '<p><b>How to play</b></p>' +
    '<ul>' +
    '<li>Each of the 7 packets carries 4 data bits. Pick a coding scheme for it ' +
    '<i>before</i> you transmit.</li>' +
    '<li>Every scheme shows its <b>P_ok</b> for tonight’s noise level — the ' +
    'chance the packet lands intact — and its cost in channel uses.</li>' +
    '<li>Transmit. Flipped bits flash red; Hamming repairs a single flip; ' +
    'packets that fail bounce back into the queue and must be re-sent (more uses).</li>' +
    '<li>Deliver all 7 before the budget runs out. The <b>Shannon floor</b> is the ' +
    'theoretical minimum uses — you can’t beat it.</li>' +
    '</ul>',

  concept:
    '<p>A binary symmetric channel flips each bit with probability <i>p</i>. Its ' +
    'capacity is <b>C = 1 − H₂(p)</b> bits per channel use, where ' +
    'H₂(p) = −p&nbsp;log₂&nbsp;p − (1−p)&nbsp;log₂(1−p). ' +
    'Reliable communication is possible at any rate below C and impossible above it ' +
    '(the channel coding theorem, 3B).</p>' +
    '<p>So 28 bits cost at least 28 / C channel uses — the Shannon floor. ' +
    'Codes buy reliability with redundancy: every parity or repeated bit you add is a ' +
    'use that carries no new data, which is exactly why the floor rises as the noise does.</p>',

  create: function (root, api) {
    /* ---- all mutable state lives here, rebuilt every create() (replay-safe) ---- */
    var timers = [];                 // pending setTimeout ids (cancelled in destroy)
    var keyHandler = null;           // document-level listener (removed in destroy)
    var destroyed = false;

    var missionIdx = 0;
    var completed = 0;               // missions cleared
    var sumFloor = 0;                // Shannon floor uses over cleared missions
    var sumUses = 0;                 // uses spent on cleared missions
    var perMission = [];             // {p, floor, uses, retrans, cleared}
    var transmitting = false;

    // current mission scratch
    var p = 0, budget = 0, floor = 0;
    var usesSpent = 0;
    var retrans = 0;
    var queue = [];                  // packet objects still to deliver
    var delivered = 0;

    function later(fn, ms) {         // setTimeout that auto-tracks for teardown
      var id = setTimeout(function () {
        if (destroyed) return;
        fn();
      }, ms);
      timers.push(id);
      return id;
    }
    function clearTimers() {
      for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
      timers = [];
    }

    api.injectStyle(STYLE);

    function setStatus() {
      api.status(
        'Mission ' + (missionIdx + 1) + '/3 &nbsp;·&nbsp; p = ' + p +
        ' &nbsp;·&nbsp; budget ' + (budget - usesSpent) + '/' + budget + ' uses'
      );
    }

    /* random 4-bit data payload for a fresh packet */
    function randData() {
      var d = [];
      for (var i = 0; i < PKT_BITS; i++) d.push(api.rng() < 0.5 ? 1 : 0);
      return d;
    }

    /* ------------------------------------------------------------------ */
    /* mission lifecycle                                                  */
    /* ------------------------------------------------------------------ */

    function startMission() {
      var m = MISSIONS[missionIdx];
      p = m.p;
      budget = m.budget;
      floor = shannonFloorUses(DATA_BITS, p);
      usesSpent = 0;
      retrans = 0;
      delivered = 0;
      transmitting = false;
      queue = [];
      for (var i = 0; i < NUM_PKTS; i++) {
        queue.push({ id: i + 1, data: randData(), scheme: 'ham', tries: 0, state: 'queued' });
      }
      setStatus();
      render();
    }

    function missionFloorCeil() { return Math.ceil(floor); }

    /* record outcome of the current mission and advance / finish */
    function endMission(cleared) {
      perMission.push({
        p: p, floor: floor, uses: usesSpent, retrans: retrans, cleared: cleared,
      });
      if (cleared) {
        completed++;
        sumFloor += floor;
        sumUses += usesSpent;
        api.sfx('good');
      } else {
        api.sfx('bad');
      }
      missionIdx++;
      if (missionIdx >= MISSIONS.length) {
        finish();
      } else {
        renderInterstitial(cleared);
      }
    }

    /* ------------------------------------------------------------------ */
    /* transmit resolution + animation                                    */
    /* ------------------------------------------------------------------ */

    /* simulate one packet attempt under scheme; returns a render plan:
       { ok, bits:[{val,flipped}], corrected, schemeKey } */
    function resolveAttempt(pkt) {
      var sch = pkt.scheme;
      var bits, corrected = false, ok;
      if (sch === 'raw') {
        bits = pkt.data.map(function (b) {
          var f = api.rng() < p;
          return { val: b, flipped: f };
        });
        ok = bits.every(function (b) { return !b.flipped; });
      } else if (sch === 'ham') {
        var code = hammingEncode(pkt.data);
        var recv = [];
        bits = code.map(function (b) {
          var f = api.rng() < p;
          recv.push(f ? (b ^ 1) : b);
          return { val: b, flipped: f };
        });
        var nflip = bits.reduce(function (a, b) { return a + (b.flipped ? 1 : 0); }, 0);
        var syn = hammingSyndrome(recv);
        // decoder fixes the bit pointed to by the syndrome; succeeds iff <=1 flip
        if (syn !== 0) corrected = true;
        ok = (nflip <= 1);
      } else { // r3
        // 12 transmitted bits: 4 data bits x 3 copies; majority decode per bit
        bits = [];
        var bitOk = [];
        for (var i = 0; i < PKT_BITS; i++) {
          var ones = 0;
          for (var k = 0; k < 3; k++) {
            var f = api.rng() < p;
            bits.push({ val: pkt.data[i], flipped: f });
            if ((pkt.data[i] ^ (f ? 1 : 0)) === 1) ones++; // received-as-1 count
          }
          // majority decodes to the data bit unless 2+ of its 3 copies flipped
          var copiesFlipped = 0;
          for (var j = bits.length - 3; j < bits.length; j++) if (bits[j].flipped) copiesFlipped++;
          bitOk.push(copiesFlipped <= 1);
        }
        corrected = bits.some(function (b) { return b.flipped; }) && bitOk.every(function (x) { return x; });
        ok = bitOk.every(function (x) { return x; });
      }
      return { ok: ok, bits: bits, corrected: corrected, schemeKey: sch };
    }

    /* animate one wave: stream the bits in, flash flips, settle to ok/fail.
       Strictly time-boxed (<= ~1.6s) and fully cancellable via clearTimers. */
    function transmitAll() {
      if (transmitting) return;
      transmitting = true;
      setStatus();

      // spend uses + resolve every queued packet up front (deterministic spend).
      // Cheapest-first so a tight budget still sends as many packets as it can;
      // if a packet's chosen scheme won't fit but RAW would, the dish falls back
      // to RAW for that attempt — this guarantees a wave always makes progress
      // whenever any packet can possibly be sent, so the run can never softlock.
      var toSend = queue.slice().sort(function (a, b) { return COST[a.scheme] - COST[b.scheme]; });
      var plans = [];
      for (var i = 0; i < toSend.length; i++) {
        var pkt = toSend[i];
        var cost = COST[pkt.scheme];
        if (usesSpent + cost > budget) {
          // chosen scheme won't fit; fall back to RAW if even that fits
          if (usesSpent + COST.raw > budget) continue; // nothing affordable — skip
          pkt.scheme = 'raw';
          cost = COST.raw;
        }
        usesSpent += cost;
        pkt.tries++;
        plans.push({ pkt: pkt, plan: resolveAttempt(pkt) });
      }
      setStatus();

      renderTransmit(plans);
    }

    /* called when the transmit animation finishes resolving a wave */
    function settleWave(plans) {
      var survivors = [];   // packets still queued (failed or never sent)
      var newDelivered = 0;
      var sentIds = {};
      plans.forEach(function (e) {
        sentIds[e.pkt.id] = true;
        if (e.plan.ok) {
          e.pkt.state = 'done';
          newDelivered++;
        } else {
          e.pkt.state = 'queued';
          retrans++;
          survivors.push(e.pkt);
        }
      });
      // packets that were never sent this wave (budget cut the wave short)
      queue.forEach(function (pkt) {
        if (!sentIds[pkt.id]) survivors.push(pkt);
      });
      delivered += newDelivered;
      queue = survivors;
      transmitting = false;

      setStatus();

      if (queue.length === 0) { endMission(true); return; }

      // can we still afford to send even the cheapest remaining packet?
      var cheapest = Math.min.apply(null, queue.map(function (q) { return COST[q.scheme]; }));
      var minPossible = Math.min(COST.raw, cheapest);
      if (usesSpent + minPossible > budget) { endMission(false); return; }

      render();
    }

    /* ------------------------------------------------------------------ */
    /* rendering                                                          */
    /* ------------------------------------------------------------------ */

    function schemeStat(key) {
      for (var i = 0; i < SCHEMES.length; i++) if (SCHEMES[i].key === key) return SCHEMES[i];
      return SCHEMES[0];
    }

    function setAll(key) {
      api.sfx('click');
      queue.forEach(function (pkt) { if (pkt.state !== 'done') pkt.scheme = key; });
      render();
    }

    function clearRoot() { root.replaceChildren(); }

    function elc(tag, cls, html) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (html != null) n.innerHTML = html;
      return n;
    }

    /* main mission screen: budget header + packet choosers + transmit */
    function render() {
      if (destroyed) return;
      clearRoot();

      // header: budget gauge with Shannon floor marker
      var head = elc('div', 'nu-head g-card');
      var floorN = missionFloorCeil();
      var remaining = budget - usesSpent;
      var pct = clamp(usesSpent / budget, 0, 1) * 100;
      var floorPct = clamp(floor / budget, 0, 1) * 100;
      head.innerHTML =
        '<div class="nu-head-row">' +
          '<span class="nu-mtag">Mission ' + (missionIdx + 1) + ' / 3</span>' +
          '<span class="nu-pnoise">storm noise &nbsp;p = <b>' + p + '</b></span>' +
        '</div>' +
        '<div class="nu-cap">capacity C = 1 − H₂(' + p + ') = <b>' +
          capacity(p).toFixed(3) + '</b> bits/use' +
          ' &nbsp;·&nbsp; Shannon floor: <b>' + floorN + ' uses</b> for 28 bits</div>' +
        '<div class="nu-gauge">' +
          '<div class="nu-gauge-fill" style="width:' + pct.toFixed(1) + '%"></div>' +
          '<div class="nu-gauge-floor" style="left:' + floorPct.toFixed(1) + '%" ' +
            'title="Shannon floor"></div>' +
        '</div>' +
        '<div class="nu-gauge-legend">' +
          '<span>spent <b>' + usesSpent + '</b></span>' +
          '<span class="nu-floormark">▏floor ' + floorN + '</span>' +
          '<span>budget <b>' + budget + '</b> · <b class="' +
            (remaining <= 0 ? 'nu-danger' : '') + '">' + remaining + '</b> left</span>' +
        '</div>' +
        '<div class="nu-prog">delivered <b>' + delivered + '</b> / 7 &nbsp;·&nbsp; ' +
          'retransmissions <b>' + retrans + '</b></div>';
      root.appendChild(head);

      // set-all toolbar
      var bar = elc('div', 'nu-setall');
      bar.appendChild(elc('span', 'nu-setall-lbl', 'set all queued →'));
      SCHEMES.forEach(function (s) {
        var b = elc('button', 'nu-chip nu-chip-' + s.key, s.name);
        b.addEventListener('click', function () { setAll(s.key); });
        bar.appendChild(b);
      });
      root.appendChild(bar);

      // packet list
      var list = elc('div', 'nu-queue');
      queue.slice().sort(function (a, b) { return a.id - b.id; }).forEach(function (pkt) {
        list.appendChild(packetCard(pkt));
      });
      if (queue.length === 0) list.appendChild(elc('div', 'nu-empty', 'queue clear'));
      root.appendChild(list);

      // transmit button + affordability hint
      var foot = elc('div', 'nu-foot');
      var plannedCost = queue.reduce(function (a, q) { return a + COST[q.scheme]; }, 0);
      var afford = usesSpent + plannedCost <= budget;
      var tx = elc('button', 'btn btn-primary nu-tx', '⇅ Transmit wave (' + plannedCost + ' uses)');
      tx.addEventListener('click', function () { api.sfx('tick'); transmitAll(); });
      foot.appendChild(tx);
      var hint = elc('div', 'nu-hint',
        afford
          ? 'This wave fits the budget.'
          : 'Wave costs ' + plannedCost + ' uses but only ' + remaining +
            ' remain — cheaper packets will be sent first.');
      if (!afford) hint.classList.add('nu-hint-warn');
      foot.appendChild(hint);
      root.appendChild(foot);
    }

    /* one packet row with a live three-way scheme chooser showing P_ok */
    function packetCard(pkt) {
      var card = elc('div', 'nu-pkt g-card');
      var hdr = elc('div', 'nu-pkt-hdr');
      hdr.innerHTML =
        '<span class="nu-pkt-id">PKT ' + pkt.id + '</span>' +
        '<span class="nu-pkt-data">data ' + pkt.data.join('') + '</span>' +
        (pkt.tries > 0 ? '<span class="nu-pkt-retry">↻ retry ×' + pkt.tries + '</span>' : '');
      card.appendChild(hdr);

      var opts = elc('div', 'nu-opts');
      SCHEMES.forEach(function (s) {
        var pk = s.pOk(p);
        var on = pkt.scheme === s.key;
        var btn = elc('button', 'nu-opt' + (on ? ' nu-opt-on' : ''));
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.innerHTML =
          '<span class="nu-opt-name">' + s.name + '</span>' +
          '<span class="nu-opt-pok">P_ok ' + fmtPct(pk) + '</span>' +
          '<span class="nu-opt-cost">' + s.cost + ' uses</span>';
        btn.addEventListener('click', function () {
          if (transmitting) return;
          api.sfx('click');
          pkt.scheme = s.key;
          render();
        });
        opts.appendChild(btn);
      });
      card.appendChild(opts);
      return card;
    }

    /* transmit animation: stream each wave packet's bits, flash flips, settle.
       Time-boxed; every timer goes through later() so destroy() kills it. */
    function renderTransmit(plans) {
      if (destroyed) return;
      clearRoot();

      var wrap = elc('div', 'nu-tx-stage g-card');
      wrap.appendChild(elc('div', 'nu-tx-title', '⇅ transmitting wave through the storm…'));

      if (plans.length === 0) {
        // nothing affordable was sent — go straight to settle (will end mission)
        wrap.appendChild(elc('div', 'nu-tx-row', 'budget exhausted — no packet could be sent'));
        root.appendChild(wrap);
        later(function () { settleWave(plans); }, 600);
        return;
      }

      var rows = [];
      plans.forEach(function (e) {
        var row = elc('div', 'nu-tx-row');
        var label = elc('span', 'nu-tx-lbl', 'PKT ' + e.pkt.id + ' · ' + schemeStat(e.pkt.scheme).name);
        var stream = elc('span', 'nu-tx-stream');
        e.plan.bits.forEach(function (b) {
          var cell = elc('span', 'nu-bit', String(b.val));
          stream.appendChild(cell);
        });
        var verdict = elc('span', 'nu-tx-verdict', '');
        row.appendChild(label);
        row.appendChild(stream);
        row.appendChild(verdict);
        wrap.appendChild(row);
        rows.push({ e: e, stream: stream, verdict: verdict });
      });
      root.appendChild(wrap);

      // wave 1: reveal flips quickly across all rows
      var REVEAL = 700, SETTLE = 650;
      later(function () {
        if (destroyed) return;
        rows.forEach(function (r) {
          var cells = r.stream.querySelectorAll('.nu-bit');
          r.e.plan.bits.forEach(function (b, i) {
            if (b.flipped && cells[i]) {
              cells[i].classList.add('nu-bit-flip');
              cells[i].textContent = String(b.val ^ 1);
            }
          });
        });
        api.sfx('tick');
      }, REVEAL);

      // wave 2: settle each row to corrected / ok / fail
      later(function () {
        if (destroyed) return;
        rows.forEach(function (r) {
          var pl = r.e.plan;
          if (pl.ok && pl.corrected && pl.schemeKey === 'ham') {
            r.verdict.innerHTML = 'corrected ✓';
            r.verdict.className = 'nu-tx-verdict nu-ok nu-corrected';
          } else if (pl.ok && pl.corrected && pl.schemeKey === 'r3') {
            r.verdict.innerHTML = 'voted ✓';
            r.verdict.className = 'nu-tx-verdict nu-ok nu-corrected';
          } else if (pl.ok) {
            r.verdict.innerHTML = 'delivered ✓';
            r.verdict.className = 'nu-tx-verdict nu-ok';
          } else {
            r.verdict.innerHTML = 'lost ✕';
            r.verdict.className = 'nu-tx-verdict nu-fail';
            r.stream.classList.add('nu-stream-fail');
          }
        });
      }, REVEAL + SETTLE);

      // finalize: hand back to game logic
      later(function () { settleWave(plans); }, REVEAL + SETTLE + 550);
    }

    /* between-mission screen */
    function renderInterstitial(cleared) {
      if (destroyed) return;
      clearRoot();
      setStatus();
      var prev = perMission[perMission.length - 1];
      var card = elc('div', 'nu-inter g-card');
      card.innerHTML =
        '<div class="nu-inter-tag ' + (cleared ? 'nu-ok' : 'nu-fail') + '">' +
          (cleared ? '✓ relay link held' : '✕ link collapsed — budget gone') + '</div>' +
        '<div class="nu-inter-line">Mission ' + perMission.length + ' (p = ' + prev.p + '): ' +
          'spent <b>' + prev.uses + '</b> uses · floor <b>' + Math.ceil(prev.floor) + '</b> · ' +
          '<b>' + prev.retrans + '</b> retransmissions</div>' +
        '<div class="nu-inter-next">Next: Mission ' + (missionIdx + 1) + ' / 3 — ' +
          'noise rises to p = <b>' + MISSIONS[missionIdx].p + '</b>, ' +
          'budget <b>' + MISSIONS[missionIdx].budget + '</b> uses.</div>';
      var go = elc('button', 'btn btn-primary nu-next', '▶ Open next channel');
      go.addEventListener('click', function () { api.sfx('click'); startMission(); });
      card.appendChild(go);
      root.appendChild(card);
    }

    /* ------------------------------------------------------------------ */
    /* scoring + finish                                                   */
    /* ------------------------------------------------------------------ */

    function finish() {
      if (destroyed) return;
      var M = completed;
      var e = sumUses > 0 ? sumFloor / sumUses : 0;   // efficiency vs Shannon floor
      var stars;
      if (M === 3 && e >= 0.55) stars = 3;
      else if (M === 3) stars = 2;
      else if (M >= 2) stars = 1;
      else stars = 0;
      var bits = clamp(Math.round(M * 10 + 25 * e), 0, 50);

      var headline =
        M === 3 ? (stars === 3 ? 'Relay restored — clean uplink' : 'Relay restored')
                : (M > 0 ? 'Partial uplink — ' + M + '/3 channels held'
                         : 'Uplink lost in the storm');

      api.complete({
        stars: stars,
        bits: bits,
        headline: headline,
        detailHTML: buildDetail(M, e),
      });
    }

    function buildDetail(M, e) {
      var rows = '';
      for (var i = 0; i < perMission.length; i++) {
        var m = perMission[i];
        rows +=
          '<tr' + (m.cleared ? '' : ' class="nu-row-fail"') + '>' +
            '<td>' + (i + 1) + '</td>' +
            '<td>' + m.p + '</td>' +
            '<td>' + Math.ceil(m.floor) + '</td>' +
            '<td>' + m.uses + '</td>' +
            '<td>' + m.retrans + '</td>' +
            '<td>' + (m.cleared ? '✓' : '✕') + '</td>' +
          '</tr>';
      }
      var effPct = (100 * e).toFixed(0);
      return '' +
        '<table class="nu-detail">' +
          '<tr><th>#</th><th>p</th><th>floor</th><th>your uses</th><th>retrans</th><th>held</th></tr>' +
          rows +
        '</table>' +
        '<p>Channels held: <b>' + M + '/3</b> &nbsp;·&nbsp; ' +
          'efficiency e = floor / uses = <b>' + effPct + '%</b> ' +
          '(1.0 would mean hitting the Shannon floor exactly).</p>' +
        '<p>Noise raises H₂(p), so capacity C = 1 − H₂(p) falls and every ' +
          'delivered bit must cost more channel uses. The right amount of redundancy ' +
          'depends on p: RAW only when p is tiny, HAMMING is the sweet spot at moderate ' +
          'noise, and brute REPEAT×3 earns its keep when the channel is loud.</p>';
    }

    /* ------------------------------------------------------------------ */
    /* keyboard: 1/2/3 set-all, T transmit (never Escape)                 */
    /* ------------------------------------------------------------------ */
    keyHandler = function (ev) {
      if (destroyed || transmitting) return;
      if (ev.key === '1') { setAll('raw'); }
      else if (ev.key === '2') { setAll('ham'); }
      else if (ev.key === '3') { setAll('r3'); }
      else if (ev.key === 't' || ev.key === 'T') {
        if (queue.length) { api.sfx('tick'); transmitAll(); }
      }
    };
    document.addEventListener('keydown', keyHandler);

    /* ---- boot ---- */
    startMission();

    return {
      destroy: function () {
        destroyed = true;
        clearTimers();
        if (keyHandler) document.removeEventListener('keydown', keyHandler);
        keyHandler = null;
      },
    };
  },
});

/* ============================ styles ============================ */
var STYLE =
'.nu-head{display:flex;flex-direction:column;gap:.5rem;}' +
'.nu-head-row{display:flex;justify-content:space-between;align-items:baseline;gap:.6rem;flex-wrap:wrap;}' +
'.nu-mtag{font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--pink);font-weight:700;}' +
'.nu-pnoise{font-size:.82rem;color:var(--muted);}' +
'.nu-pnoise b{color:var(--red);}' +
'.nu-cap{font-size:.82rem;color:var(--muted);line-height:1.5;}' +
'.nu-cap b{color:var(--text);}' +
'.nu-gauge{position:relative;height:14px;background:var(--surface2);border-radius:7px;overflow:visible;margin-top:.2rem;}' +
'.nu-gauge-fill{height:100%;background:linear-gradient(90deg,var(--blue),var(--pink));border-radius:7px;transition:width .3s;}' +
'.nu-gauge-floor{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--gold);box-shadow:0 0 6px var(--gold);}' +
'.nu-gauge-legend{display:flex;justify-content:space-between;font-size:.74rem;color:var(--muted);margin-top:.35rem;flex-wrap:wrap;gap:.4rem;}' +
'.nu-gauge-legend b{color:var(--text);}' +
'.nu-floormark{color:var(--gold);}' +
'.nu-danger{color:var(--red);}' +
'.nu-prog{font-size:.82rem;color:var(--muted);}' +
'.nu-prog b{color:var(--green);}' +
'.nu-setall{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;}' +
'.nu-setall-lbl{font-size:.76rem;color:var(--dim);letter-spacing:.04em;}' +
'.nu-chip{min-height:40px;padding:.4rem .8rem;border-radius:8px;border:1px solid var(--border);' +
  'background:var(--surface);color:var(--text);font-size:.82rem;cursor:pointer;font-family:inherit;}' +
'.nu-chip:hover{border-color:var(--blue);color:var(--blue);}' +
'.nu-chip-raw:hover{border-color:var(--green);color:var(--green);}' +
'.nu-chip-ham:hover{border-color:var(--blue);color:var(--blue);}' +
'.nu-chip-r3:hover{border-color:var(--orange);color:var(--orange);}' +
'.nu-queue{display:grid;gap:.6rem;}' +
'.nu-empty{color:var(--dim);text-align:center;padding:1rem;}' +
'.nu-pkt{padding:.7rem .8rem;}' +
'.nu-pkt-hdr{display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem;flex-wrap:wrap;}' +
'.nu-pkt-id{font-weight:700;font-size:.8rem;letter-spacing:.08em;color:var(--cyan);}' +
'.nu-pkt-data{font-family:ui-monospace,Consolas,monospace;font-size:.82rem;color:var(--muted);letter-spacing:.18em;}' +
'.nu-pkt-retry{font-size:.72rem;color:var(--yellow);}' +
'.nu-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:.45rem;}' +
'.nu-opt{display:flex;flex-direction:column;gap:.1rem;min-height:56px;padding:.45rem .35rem;border-radius:8px;' +
  'border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer;font-family:inherit;' +
  'text-align:center;transition:all .15s;}' +
'.nu-opt:hover{border-color:var(--blue);}' +
'.nu-opt-on{border-color:var(--pink);background:rgba(244,114,182,.12);box-shadow:0 0 0 1px var(--pink) inset;}' +
'.nu-opt-name{font-size:.72rem;font-weight:700;letter-spacing:.02em;}' +
'.nu-opt-pok{font-size:.86rem;color:var(--green);font-weight:600;}' +
'.nu-opt-cost{font-size:.68rem;color:var(--dim);}' +
'.nu-foot{display:flex;flex-direction:column;gap:.45rem;align-items:stretch;}' +
'.nu-tx{min-height:44px;font-size:1rem;}' +
'.nu-hint{font-size:.76rem;color:var(--dim);text-align:center;}' +
'.nu-hint-warn{color:var(--yellow);}' +
'.nu-tx-stage{display:flex;flex-direction:column;gap:.6rem;}' +
'.nu-tx-title{font-size:.88rem;color:var(--pink);letter-spacing:.04em;}' +
'.nu-tx-row{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;}' +
'.nu-tx-lbl{font-size:.74rem;color:var(--muted);min-width:140px;}' +
'.nu-tx-stream{display:flex;gap:3px;flex-wrap:wrap;}' +
'.nu-stream-fail{opacity:.65;}' +
'.nu-bit{display:inline-flex;align-items:center;justify-content:center;width:18px;height:22px;border-radius:3px;' +
  'background:var(--surface2);color:var(--text);font-family:ui-monospace,Consolas,monospace;font-size:.74rem;' +
  'animation:nu-stream .35s ease-out;}' +
'.nu-bit-flip{background:var(--red);color:#1a0000;font-weight:700;animation:nu-flash .4s ease-out;}' +
'@keyframes nu-stream{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:none;}}' +
'@keyframes nu-flash{0%{transform:scale(1.4);}100%{transform:scale(1);}}' +
'.nu-tx-verdict{font-size:.78rem;font-weight:600;margin-left:auto;}' +
'.nu-ok{color:var(--green);}' +
'.nu-corrected{color:var(--cyan);}' +
'.nu-fail{color:var(--red);}' +
'.nu-inter{display:flex;flex-direction:column;gap:.7rem;text-align:center;align-items:center;}' +
'.nu-inter-tag{font-size:1.05rem;font-weight:700;}' +
'.nu-inter-line,.nu-inter-next{font-size:.86rem;color:var(--muted);line-height:1.5;}' +
'.nu-inter-line b,.nu-inter-next b{color:var(--text);}' +
'.nu-next{min-height:44px;margin-top:.3rem;}' +
'.nu-detail{width:100%;border-collapse:collapse;}' +
'.nu-detail th,.nu-detail td{padding:.25rem .4rem;border-bottom:1px solid var(--surface2);text-align:center;font-size:.82rem;}' +
'.nu-detail th{color:var(--muted);font-weight:600;}' +
'.nu-row-fail td{color:var(--red);}' +
'@media (max-width:420px){' +
  '.nu-opt-pok{font-size:.78rem;}' +
  '.nu-tx-lbl{min-width:0;width:100%;}' +
  '.nu-opt{min-height:52px;}' +
'}';

})();
