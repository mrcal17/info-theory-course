/* SIGNAL LOST — 08 · The Last Transmission (last-transmission) — THE BOSS.
   Source coding × channel coding against one shared energy budget. Compress a
   message to near its entropy, protect it up to capacity, repair the rest.
   The whole course in one pipeline: minimum cost = H(source)·n / C(channel).
   Contract: ../DESIGN.md. No canvas; DOM + inline SVG only. */
(function () {
'use strict';

/* ============================== pure math ==============================
   Every game quantity is computed here, side-effect free, so the Huffman cost,
   the rank-permutation penalty, the channel P_ok formulas and the Venn syndrome
   can be reviewed and unit-tested without touching the DOM. */

function log2(x) { return Math.log(x) / Math.LN2; }
function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

// Symbol-frequency table for a string. Returns [{sym, count}] sorted by count
// DESC, ties broken by symbol order (stable, deterministic) so the "true rank"
// is well-defined. ' ' is rendered elsewhere as the glyph '␣'.
function freqTable(msg) {
  var map = {};
  var order = [];
  for (var i = 0; i < msg.length; i++) {
    var c = msg.charAt(i);
    if (!(c in map)) { map[c] = 0; order.push(c); }
    map[c]++;
  }
  var rows = order.map(function (c) { return { sym: c, count: map[c] }; });
  rows.sort(function (a, b) {
    if (b.count !== a.count) return b.count - a.count;
    return a.sym < b.sym ? -1 : (a.sym > b.sym ? 1 : 0);
  });
  return rows;
}

// Shannon entropy (bits/symbol) of a list of counts.
function entropyOfCounts(counts) {
  var n = 0, i;
  for (i = 0; i < counts.length; i++) n += counts[i];
  if (n <= 0) return 0;
  var h = 0;
  for (i = 0; i < counts.length; i++) {
    var p = counts[i] / n;
    if (p > 0) h -= p * log2(p);
  }
  return h;
}

// Canonical Huffman codeword LENGTHS for a list of weights (counts), returned
// in the SAME order as the input weights. Greedy: repeatedly merge the two
// least-probable live nodes. Pure — never mutates the input array.
function huffmanLengths(weights) {
  var n = weights.length;
  if (n === 0) return [];
  if (n === 1) return [1]; // one symbol still costs one bit to send.
  var nodes = [];
  var i;
  for (i = 0; i < n; i++) nodes.push({ w: weights[i], idx: i, left: null, right: null });
  var live = nodes.slice();
  while (live.length > 1) {
    var a = 0, b = -1;
    for (i = 1; i < live.length; i++) if (live[i].w < live[a].w) a = i;
    for (i = 0; i < live.length; i++) {
      if (i === a) continue;
      if (b < 0 || live[i].w < live[b].w) b = i;
    }
    var na = live[a], nb = live[b];
    var parent = { w: na.w + nb.w, idx: -1, left: na, right: nb };
    var hi = Math.max(a, b), lo = Math.min(a, b);
    live.splice(hi, 1); live.splice(lo, 1);
    live.push(parent);
  }
  var lengths = new Array(n).fill(0);
  (function walk(node, depth) {
    if (!node.left && !node.right) { lengths[node.idx] = depth; return; }
    if (node.left) walk(node.left, depth + 1);
    if (node.right) walk(node.right, depth + 1);
  })(live[0], 0);
  return lengths;
}

// The OPTIMAL compressed size in bits: Σ count_i · ℓ_i where ℓ_i are the Huffman
// lengths assigned to each symbol by TRUE frequency (frequent ⇒ short).
// `rows` is the true-ranked freq table (count DESC). We assign the sorted
// codeword lengths (ascending) to symbols in descending-count order — that is
// exactly the canonical Huffman cost. Returns total bits.
function optimalBits(rows) {
  var counts = rows.map(function (r) { return r.count; });
  var lens = huffmanLengths(counts).slice().sort(function (x, y) { return x - y; });
  // rows already sorted count DESC; lens ascending ⇒ shortest code to the most
  // frequent symbol. (Rearranging code lengths among equal multiset of lengths
  // never changes prefix-validity; this is the optimal rank-matched assignment.)
  var total = 0;
  for (var i = 0; i < rows.length; i++) total += rows[i].count * lens[i];
  return total;
}

// The PLAYER'S compressed size. The encoder hands out the SAME multiset of
// Huffman code lengths (ascending), but matched to the player's predicted rank:
// the symbol the player ranked #1 gets the shortest codeword, etc. The TRUE
// counts pay the bill. `rows` = true-ranked table; `playerOrder` = array of
// symbols, best-guess-most-frequent first (a permutation of the symbols).
// Returns { bits, perSym: [{sym, count, len, optLen, mismatched}] }.
function playerBits(rows, playerOrder) {
  var counts = rows.map(function (r) { return r.count; });
  var lens = huffmanLengths(counts).slice().sort(function (x, y) { return x - y; });
  // optimal length each symbol *should* get, keyed by symbol (true rank ⇒ lens[i]).
  var optLenBySym = {};
  for (var i = 0; i < rows.length; i++) optLenBySym[rows[i].sym] = lens[i];
  // count by symbol, for the bill.
  var countBySym = {};
  for (i = 0; i < rows.length; i++) countBySym[rows[i].sym] = rows[i].count;
  // assign lens[j] to the symbol the player ranked at position j.
  var total = 0;
  var perSym = [];
  for (var j = 0; j < playerOrder.length; j++) {
    var sym = playerOrder[j];
    var len = lens[j];
    var cnt = countBySym[sym];
    total += cnt * len;
    perSym.push({
      sym: sym, count: cnt, len: len, optLen: optLenBySym[sym],
      mismatched: len !== optLenBySym[sym],
    });
  }
  return { bits: total, perSym: perSym };
}

// Channel success probabilities for a single packet at noise p.
// RAW: 4 uses, packet ok iff all 4 bits survive  ⇒ (1−p)^4.
function pokRaw(p) { return Math.pow(1 - p, 4); }
// HAMMING(7,4): 7 uses, corrects ≤1 flip ⇒ P(0 or 1 flip in 7) = (1−p)^7 + 7p(1−p)^6.
function pokHamming(p) { return Math.pow(1 - p, 7) + 7 * p * Math.pow(1 - p, 6); }
// REPEAT×3: 12 uses, majority vote per bit. Per-bit ok = (1−p)^3 + 3p(1−p)^2.
// Packet (4 bits) ok = perBit^4.
function pokRepeat(p) {
  var perBit = Math.pow(1 - p, 3) + 3 * p * Math.pow(1 - p, 2);
  return Math.pow(perBit, 4);
}

var SCHEME_USES = { raw: 4, hamming: 7, repeat: 12 };
function pokOf(scheme, p) {
  return scheme === 'raw' ? pokRaw(p) : scheme === 'hamming' ? pokHamming(p) : pokRepeat(p);
}

// Split a bitstring into 4-bit packets, padding the final packet with zeros.
function splitPackets(bits) {
  var out = [];
  for (var i = 0; i < bits.length; i += 4) {
    var chunk = bits.substr(i, 4);
    while (chunk.length < 4) chunk += '0';
    out.push(chunk);
  }
  if (out.length === 0) out.push('0000');
  return out;
}

/* ---- Hamming(7,4) on the three-circle Venn layout ----
   Cell roles (bit positions in our codeword array, length 7):
     [0]=p1 (A only), [1]=p2 (B only), [2]=p3 (C only),
     [3]=d1 (A∩B), [4]=d2 (A∩C), [5]=d3 (B∩C), [6]=d4 (A∩B∩C center).
   Circle memberships:
     A = {p1, d1, d2, d4} = indices {0,3,4,6}
     B = {p2, d1, d3, d4} = indices {1,3,5,6}
     C = {p3, d2, d3, d4} = indices {2,4,5,6}
   Encode: choose p1,p2,p3 so each circle has EVEN parity. */
var CIRCLE_A = [0, 3, 4, 6];
var CIRCLE_B = [1, 3, 5, 6];
var CIRCLE_C = [2, 4, 5, 6];

// Encode 4 data bits [d1,d2,d3,d4] into the 7-cell codeword above.
function vennEncode(d1, d2, d3, d4) {
  var cw = [0, 0, 0, 0, 0, 0, 0];
  cw[3] = d1; cw[4] = d2; cw[5] = d3; cw[6] = d4;
  // parity bit = XOR of the data cells in its circle (so circle parity is even).
  cw[0] = d1 ^ d2 ^ d4;       // p1 closes circle A: p1 ⊕ d1 ⊕ d2 ⊕ d4 = 0
  cw[1] = d1 ^ d3 ^ d4;       // p2 closes circle B
  cw[2] = d2 ^ d3 ^ d4;       // p3 closes circle C
  return cw;
}

// Parity of a circle = XOR of its cells. Returns 1 (odd) or 0 (even).
function circleParity(cw, circle) {
  var x = 0;
  for (var i = 0; i < circle.length; i++) x ^= cw[circle[i]];
  return x;
}

// Syndrome → index of the single flipped bit (0..6), or -1 if no error.
// The flipped cell is the unique one lying in EXACTLY the set of odd circles.
function vennSyndrome(cw) {
  var a = circleParity(cw, CIRCLE_A);
  var b = circleParity(cw, CIRCLE_B);
  var c = circleParity(cw, CIRCLE_C);
  if (a === 0 && b === 0 && c === 0) return -1;
  // membership table indexed by cell: which circles contain it.
  var inA = { 0: 1, 3: 1, 4: 1, 6: 1 };
  var inB = { 1: 1, 3: 1, 5: 1, 6: 1 };
  var inC = { 2: 1, 4: 1, 5: 1, 6: 1 };
  for (var i = 0; i < 7; i++) {
    if ((inA[i] ? 1 : 0) === a && (inB[i] ? 1 : 0) === b && (inC[i] ? 1 : 0) === c) return i;
  }
  return -1; // unreachable for a valid single-flip codeword
}

/* ============================ content ============================ */

// Victory message — lowercase a–z + space, 36 symbols.
var MESSAGE = 'the network remembers what the noise forgot';
var NOISE_P = 0.10;

// glyph for a symbol (space → visible box).
function glyph(sym) { return sym === ' ' ? '␣' : sym; }

var STYLE = [
  '.lt-wrap{display:flex;flex-direction:column;gap:0.9rem;}',
  '.lt-banner{font-size:0.85rem;line-height:1.55;color:var(--muted);}',
  '.lt-banner b{color:var(--text);}',
  '.lt-label{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.15em;color:var(--dim);font-weight:700;margin-bottom:0.35rem;}',
  /* persistent budget bar */
  '.lt-budget{position:sticky;top:0;z-index:5;background:var(--bg);padding:0.55rem 0;border-bottom:1px solid var(--surface2);margin:-0.2rem 0 0.2rem;}',
  '.lt-budgetrow{display:flex;justify-content:space-between;align-items:baseline;gap:0.6rem;font-size:0.82rem;flex-wrap:wrap;}',
  '.lt-budgetrow b{font-variant-numeric:tabular-nums;}',
  '.lt-bbar{height:12px;background:var(--surface2);border-radius:6px;overflow:hidden;margin-top:0.35rem;position:relative;}',
  '.lt-bfill{height:100%;border-radius:6px;transition:width 0.3s,background 0.3s;}',
  '.lt-floor{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--gold);}',
  '.lt-floor::after{content:"floor";position:absolute;top:-1.05rem;left:-0.9rem;font-size:0.6rem;color:var(--gold);white-space:nowrap;}',
  '.lt-meta{font-size:0.74rem;color:var(--dim);margin-top:0.2rem;}',
  '.lt-meta .lt-gold{color:var(--gold);}',
  /* phase 1: chips */
  '.lt-chips{display:flex;flex-wrap:wrap;gap:0.45rem;}',
  '.lt-chip{display:flex;align-items:center;gap:0.4rem;min-height:44px;padding:0.3rem 0.5rem 0.3rem 0.6rem;border:2px solid var(--surface2);border-radius:10px;background:var(--surface);cursor:pointer;transition:all 0.12s;}',
  '.lt-chip:hover{border-color:var(--purple);}',
  '.lt-chip.lt-sel{border-color:var(--purple);background:#2a2342;box-shadow:0 0 0 2px rgba(167,139,250,0.35);}',
  '.lt-chip .lt-rank{font-size:0.66rem;color:var(--dim);font-variant-numeric:tabular-nums;min-width:1.2em;text-align:right;}',
  '.lt-chip .lt-sym{font-weight:700;font-size:1.05rem;font-family:ui-monospace,Consolas,monospace;min-width:1.1em;text-align:center;}',
  '.lt-chip .lt-cnt{font-size:0.68rem;color:var(--muted);}',
  '.lt-chip .lt-mv{display:flex;flex-direction:column;gap:1px;}',
  '.lt-chip .lt-mv button{min-width:30px;min-height:20px;line-height:1;padding:0;font-size:0.7rem;border:1px solid var(--border);background:var(--surface2);color:var(--text);border-radius:4px;cursor:pointer;}',
  '.lt-chip .lt-mv button:disabled{opacity:0.3;cursor:default;}',
  '.lt-freqtbl{width:100%;border-collapse:collapse;font-size:0.8rem;}',
  '.lt-freqtbl td,.lt-freqtbl th{padding:0.25rem 0.45rem;border-bottom:1px solid var(--surface2);text-align:left;}',
  '.lt-freqtbl th{color:var(--dim);font-size:0.68rem;text-transform:uppercase;letter-spacing:0.08em;}',
  '.lt-freqtbl td.lt-bad{color:var(--red);}',
  '.lt-freqtbl code{font-size:0.8em;}',
  '.lt-metricrow{display:flex;flex-wrap:wrap;gap:0.45rem;font-size:0.8rem;margin:0.3rem 0;}',
  /* phase 2: packet grid */
  '.lt-pkgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:0.5rem;}',
  '.lt-pk{border:2px solid var(--surface2);border-radius:10px;background:var(--surface);padding:0.4rem 0.45rem;font-size:0.74rem;cursor:pointer;transition:all 0.12s;min-height:44px;}',
  '.lt-pk:hover{border-color:var(--blue);}',
  '.lt-pk .lt-bits{font-family:ui-monospace,Consolas,monospace;letter-spacing:0.12em;color:var(--text);}',
  '.lt-pk .lt-sch{margin-top:0.2rem;font-size:0.68rem;color:var(--muted);}',
  '.lt-pk.lt-raw{border-color:var(--orange);}',
  '.lt-pk.lt-hamming{border-color:var(--cyan);}',
  '.lt-pk.lt-repeat{border-color:var(--green);}',
  '.lt-pk.lt-okmark{box-shadow:0 0 0 2px rgba(52,211,153,0.6) inset;}',
  '.lt-pk.lt-failmark{box-shadow:0 0 0 2px rgba(248,113,113,0.7) inset;animation:lt-shake 0.3s;}',
  '@keyframes lt-shake{0%,100%{transform:translateX(0);}30%{transform:translateX(-3px);}70%{transform:translateX(3px);}}',
  '.lt-setall{display:flex;flex-wrap:wrap;gap:0.45rem;align-items:center;font-size:0.78rem;}',
  '.lt-setall .btn{min-height:40px;padding:0.4rem 0.8rem;font-size:0.82rem;}',
  '.lt-chooser{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.5rem;}',
  '.lt-opt{border:2px solid var(--surface2);border-radius:10px;background:var(--surface);padding:0.6rem 0.7rem;cursor:pointer;transition:all 0.12s;}',
  '.lt-opt:hover{border-color:var(--blue);}',
  '.lt-opt.lt-on{border-color:var(--blue);background:#0c2a3a;}',
  '.lt-opt .lt-on-name{font-weight:700;font-size:0.9rem;}',
  '.lt-opt .lt-on-sub{font-size:0.72rem;color:var(--muted);margin-top:0.15rem;line-height:1.4;}',
  '.lt-opt .lt-pok{color:var(--green);font-variant-numeric:tabular-nums;}',
  '.lt-queue{font-size:0.82rem;color:var(--muted);}',
  '.lt-queue b{color:var(--text);}',
  /* phase 3: venn */
  '.lt-vennrow{display:flex;flex-wrap:wrap;gap:1rem;justify-content:center;}',
  '.lt-venn{width:280px;max-width:94vw;touch-action:manipulation;}',
  '.lt-board{text-align:center;}',
  '.lt-board .lt-bt{font-size:0.74rem;color:var(--muted);margin-bottom:0.2rem;}',
  '.lt-cell{cursor:pointer;}',
  '.lt-cellbg{fill:var(--surface);stroke:var(--border);stroke-width:1.2;transition:fill 0.12s;}',
  '.lt-cell:hover .lt-cellbg{fill:var(--surface2);}',
  '.lt-celltext{fill:var(--text);font-family:ui-monospace,Consolas,monospace;font-size:15px;font-weight:700;pointer-events:none;}',
  '.lt-cell.lt-solvedcell .lt-cellbg{fill:#14532d;stroke:var(--green);}',
  '.lt-vsolved{color:var(--green);font-weight:600;font-size:0.8rem;margin-top:0.2rem;}',
  /* finale */
  '.lt-final{text-align:center;padding:1rem 0.5rem;}',
  '.lt-typed{font-family:ui-monospace,Consolas,monospace;font-size:1.15rem;line-height:1.6;letter-spacing:0.04em;color:var(--green);min-height:2.4em;word-break:break-word;text-shadow:0 0 10px rgba(52,211,153,0.4);}',
  '.lt-typed .lt-caret{color:var(--green);animation:lt-blink 0.8s steps(1) infinite;}',
  '@keyframes lt-blink{0%,55%{opacity:1;}56%,100%{opacity:0;}}',
  '.lt-restored{font-size:1.5rem;font-weight:800;letter-spacing:0.18em;color:var(--gold);margin-top:1rem;text-shadow:0 0 16px rgba(251,191,36,0.4);}',
  '.lt-dissolve{font-family:ui-monospace,Consolas,monospace;font-size:1.1rem;line-height:1.6;color:var(--red);min-height:2.4em;word-break:break-word;}',
  '.lt-dead{font-size:1.3rem;font-weight:800;letter-spacing:0.12em;color:var(--red);margin-top:0.8rem;}',
  '.lt-finalbtn{margin-top:1.2rem;}',
  '.lt-hint{font-size:0.78rem;color:var(--dim);line-height:1.5;}',
  '.lt-warn{color:var(--red);font-weight:600;}',
].join('\n');

Game.register({
  id: 'last-transmission',
  title: 'The Last Transmission',
  icon: '🛰️',
  part: 7,
  module: '',
  moduleTitle: 'the course home',
  moduleUrl: '../',
  tagline: 'Compress to the floor, protect to capacity, repair what noise still breaks — one message, one budget.',

  briefing:
    '<p>Every station hums again. One message is still out there in the dark, and ' +
    'your budget — measured in channel uses — is the only power you have left to ' +
    'bring it home. Compress it, armour it against the noise, and repair the last ' +
    'damage by hand. Spend wisely: when the budget hits zero, the message is lost.</p>' +
    '<ol>' +
    '<li><b>Compress</b> — rank the symbols by frequency so the encoder gives the ' +
    'common ones the short codewords.</li>' +
    '<li><b>Protect</b> — wrap each packet in just enough redundancy to beat the ' +
    'noise without burning the budget.</li>' +
    '<li><b>Recover</b> — find the single flipped bit on each Venn board the ' +
    'decoder couldn’t fix on its own.</li>' +
    '</ol>',

  concept:
    '<p>This is the whole course in one pipeline. Shannon’s <b>source–channel ' +
    'separation theorem</b> says you may design the two halves independently and ' +
    'lose nothing: first compress the source down toward its entropy ' +
    'H(X) = −Σ pᵢ log₂ pᵢ bits/symbol (Part 2), then protect those bits with a code ' +
    'that runs up to the channel capacity C (Parts 3–4). Composed, they are still ' +
    'optimal.</p>' +
    '<p>So the floor on the entire job — the fewest channel uses that can carry an ' +
    'n-symbol message reliably — is <b>H(X)·n / C</b>. Everything you just did, ' +
    'every ranked chip and every chosen code and every repaired bit, was a fight to ' +
    'reach that number. Compress to the entropy, protect to the capacity; the rest ' +
    'is budget.</p>',

  create: function (root, api) {
    api.injectStyle(STYLE);

    /* ---------- all mutable state lives here; create() is the full reset ---------- */
    var timers = [];
    function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
    var interval = null;        // typewriter interval id
    function clearAllTimers() {
      for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
      timers = [];
      if (interval) { clearInterval(interval); interval = null; }
    }

    var done = false;           // guards api.complete to fire exactly once
    var ended = false;          // guards the win/lose screen to render once

    // ---- precomputed message facts (pure) ----
    var rows = freqTable(MESSAGE);                 // true-ranked freq table
    var trueOrder = rows.map(function (r) { return r.sym; });
    var Hsym = entropyOfCounts(rows.map(function (r) { return r.count; }));
    var n = MESSAGE.length;
    var Hfloor = Hsym * n;                          // entropy floor in bits
    var optBits = optimalBits(rows);               // best achievable compressed bits

    // ---- channel capacity of the BSC at p, for the Shannon-floor headline ----
    // C = 1 − H2(p) bits per channel use.
    function h2(q) {
      if (q <= 0 || q >= 1) return 0;
      return -q * log2(q) - (1 - q) * log2(1 - q);
    }
    var capacity = 1 - h2(NOISE_P);                // bits / channel use
    var shannonFloorUses = Hfloor / capacity;      // theoretical min channel uses

    // ---- budget: start ≈ 1.6× the Shannon floor ----
    // The floor uses the ideal capacity C = 1 − H₂(p); the codes the player can
    // actually deploy (Hamming, repeat) sit below capacity and retransmit on
    // failure, so a clean Hamming pass already costs ≈ floor uses. 1.6× leaves
    // sensible play (compress well + Hamming) comfortably in the win zone with a
    // real star spread, while over-armouring (repeat) or wasted compression
    // bites into the budget. (Simulated ≈ 80%+ success on thoughtful play.)
    var BUDGET_MULT = 1.6;
    var BUDGET_START = Math.round(shannonFloorUses * BUDGET_MULT);
    var budget = BUDGET_START;
    var MISS_PENALTY = 6;       // phase-3 wrong-click cost, in uses

    // ---- player state ----
    var phase = 1;                                 // 1,2,3
    var playerOrder = shuffle(trueOrder.slice());  // start scrambled — player must rank
    var selectedChip = -1;                         // chip selected for swap-into-position
    var compileResult = null;                      // { bits, perSym } once locked in

    // phase-2 state
    var packets = [];           // [{ bits, scheme, sent:false, ok:false }]
    var phase2Stats = { sent: 0, ok: 0, requeues: 0, usesSpent: 0 };

    // phase-3 state
    var boards = [];            // [{ data:[d1..d4], clean:[7], cw:[7], flip:idx, solved:bool }]
    var phase3Misses = 0;

    var wrap = mk('div', 'lt-wrap');
    root.replaceChildren(wrap);

    /* ---------- Fisher–Yates shuffle using api.rng (replay-safe) ---------- */
    function shuffle(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(api.rng() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }

    /* ---------- budget bar (persistent header) ---------- */
    function budgetFrac() { return clamp(budget / BUDGET_START, 0, 1); }
    function budgetColor() {
      var f = budget / shannonFloorUses; // how close to the floor we still are
      if (f >= 1.4) return 'var(--green)';
      if (f >= 1.0) return 'var(--yellow)';
      if (f >= 0.5) return 'var(--orange)';
      return 'var(--red)';
    }

    function spend(uses) {
      budget -= uses;
      if (budget < 0) budget = 0;
    }

    function renderBudget() {
      var bar = mk('div', 'lt-budget');
      var rowEl = mk('div', 'lt-budgetrow',
        '<span>Budget — <b>' + budget + '</b> / ' + BUDGET_START + ' channel uses left</span>' +
        '<span class="lt-meta lt-gold">Shannon floor: H·n / C ≈ ' + Math.round(shannonFloorUses) + ' uses</span>');
      bar.appendChild(rowEl);
      var bbar = mk('div', 'lt-bbar');
      var fill = mk('div', 'lt-bfill');
      fill.style.width = (budgetFrac() * 100).toFixed(1) + '%';
      fill.style.background = budgetColor();
      bbar.appendChild(fill);
      // the gold floor marker, positioned at floor/start of the full width.
      var floorPos = clamp(shannonFloorUses / BUDGET_START, 0, 1);
      var marker = mk('div', 'lt-floor');
      marker.style.left = (floorPos * 100).toFixed(1) + '%';
      bbar.appendChild(marker);
      bar.appendChild(bbar);
      bar.appendChild(mk('div', 'lt-meta',
        'H(source) = ' + Hsym.toFixed(2) + ' bits/sym · n = ' + n +
        ' · channel C = ' + capacity.toFixed(2) + ' bits/use (p = ' + NOISE_P.toFixed(2) + ')'));
      return bar;
    }

    function setStatus() {
      api.status('Phase ' + phase + '/3 · budget ' + budget + ' uses');
    }

    /* =====================================================================
       PHASE 1 — COMPRESS
       ===================================================================== */
    function renderPhase1() {
      wrap.replaceChildren();
      wrap.appendChild(renderBudget());
      setStatus();

      wrap.appendChild(mk('div', 'lt-banner',
        '<b>Phase 1 / 3 — Compress.</b> The encoder gives the shortest codewords to ' +
        'whatever you rank as most frequent — but the <i>true</i> frequencies pay the ' +
        'bill. Rank the symbols correctly (most frequent first) and you hit the ' +
        'optimal compressed size; rank them wrong and frequent symbols get long ' +
        'codewords, wasting bits — and bits cost channel uses.'));

      // frequency table (sorted by the TRUE frequency, the answer key shape).
      wrap.appendChild(mk('div', 'lt-label', 'Symbol frequencies in the message (' + n + ' symbols)'));
      var tbl = mk('table', 'lt-freqtbl');
      var trows = '';
      for (var i = 0; i < rows.length; i++) {
        trows += '<tr><td><code>' + glyph(rows[i].sym) + '</code></td><td>' +
          rows[i].count + '</td><td>' + (rows[i].count / n * 100).toFixed(1) + '%</td></tr>';
      }
      tbl.innerHTML = '<thead><tr><th>symbol</th><th>count</th><th>freq</th></tr></thead><tbody>' +
        trows + '</tbody></table>';
      wrap.appendChild(tbl);

      wrap.appendChild(mk('div', 'lt-label', 'Your frequency ranking — most frequent at #1'));
      wrap.appendChild(mk('div', 'lt-hint',
        'Tap a chip then tap another to swap them, or use the ▲ / ▼ buttons. ' +
        'The encoder assigns codeword lengths down this order.'));
      var chips = mk('div', 'lt-chips');
      playerOrder.forEach(function (sym, pos) {
        var row = rowForSym(sym);
        var chip = mk('div', 'lt-chip' + (selectedChip === pos ? ' lt-sel' : ''));
        chip.appendChild(mk('span', 'lt-rank', '#' + (pos + 1)));
        chip.appendChild(mk('span', 'lt-sym', glyph(sym)));
        chip.appendChild(mk('span', 'lt-cnt', '×' + row.count));
        var mv = mk('div', 'lt-mv');
        var up = mk('button', null, '▲'); up.disabled = pos === 0;
        up.addEventListener('click', function (e) { e.stopPropagation(); moveChip(pos, pos - 1); });
        var dn = mk('button', null, '▼'); dn.disabled = pos === playerOrder.length - 1;
        dn.addEventListener('click', function (e) { e.stopPropagation(); moveChip(pos, pos + 1); });
        mv.appendChild(up); mv.appendChild(dn);
        chip.appendChild(mv);
        chip.addEventListener('click', function () { tapChip(pos); });
        chips.appendChild(chip);
      });
      wrap.appendChild(chips);

      // live cost preview against the player's CURRENT order.
      var pv = playerBits(rows, playerOrder);
      var metrics = mk('div', 'lt-metricrow');
      metrics.appendChild(mk('span', 'g-pill', 'your size: ' + pv.bits + ' bits'));
      metrics.appendChild(mk('span', 'g-pill', 'optimal Huffman: ' + optBits + ' bits'));
      metrics.appendChild(mk('span', 'g-pill', 'entropy floor H·n: ' + Hfloor.toFixed(1) + ' bits'));
      if (pv.bits > optBits) {
        metrics.appendChild(mk('span', 'g-pill', '+' + (pv.bits - optBits) + ' bits over optimum'));
      } else {
        var perfect = mk('span', 'g-pill', '✓ optimal ranking');
        perfect.style.background = '#14532d'; perfect.style.color = 'var(--green)';
        metrics.appendChild(perfect);
      }
      wrap.appendChild(metrics);

      var acts = mk('div', 'lt-setall');
      var sortBtn = mk('button', 'btn btn-ghost', 'Auto-sort by frequency');
      sortBtn.addEventListener('click', function () {
        playerOrder = trueOrder.slice(); selectedChip = -1; api.sfx('click'); renderPhase1();
      });
      acts.appendChild(sortBtn);
      var lockBtn = mk('button', 'btn btn-primary', 'Lock encoder & build packets →');
      lockBtn.addEventListener('click', lockPhase1);
      acts.appendChild(lockBtn);
      wrap.appendChild(acts);
    }

    function rowForSym(sym) {
      for (var i = 0; i < rows.length; i++) if (rows[i].sym === sym) return rows[i];
      return { sym: sym, count: 0 };
    }

    function tapChip(pos) {
      api.sfx('click');
      if (selectedChip < 0) { selectedChip = pos; renderPhase1(); return; }
      if (selectedChip === pos) { selectedChip = -1; renderPhase1(); return; }
      // swap the two positions.
      var tmp = playerOrder[selectedChip];
      playerOrder[selectedChip] = playerOrder[pos];
      playerOrder[pos] = tmp;
      selectedChip = -1;
      renderPhase1();
    }

    function moveChip(from, to) {
      if (to < 0 || to >= playerOrder.length) return;
      var tmp = playerOrder[from];
      playerOrder[from] = playerOrder[to];
      playerOrder[to] = tmp;
      selectedChip = -1;
      api.sfx('click');
      renderPhase1();
    }

    function lockPhase1() {
      compileResult = playerBits(rows, playerOrder);
      api.sfx('good');
      // build the compressed bitstring deterministically from the player's code.
      var lenBySym = {};
      compileResult.perSym.forEach(function (e) { lenBySym[e.sym] = e.len; });
      // canonical codewords for the player's length assignment (order by len then rank).
      var codeMap = buildCanonicalCodes(playerOrder, lenBySym);
      var bitStr = '';
      for (var i = 0; i < MESSAGE.length; i++) bitStr += codeMap[MESSAGE.charAt(i)];
      // sanity: bit length must equal compileResult.bits.
      var pktBits = splitPackets(bitStr);
      packets = pktBits.map(function (b) {
        return { bits: b, scheme: 'hamming', sent: false, ok: false };
      });
      phase = 2;
      renderPhase2();
    }

    // Canonical prefix codes for a given length assignment. order = symbols in
    // the order codewords should be handed out (player ranking); lenBySym gives
    // each symbol's length. Standard canonical-Huffman codeword generation.
    function buildCanonicalCodes(order, lenBySym) {
      var items = order.map(function (sym) { return { sym: sym, len: lenBySym[sym] }; });
      items.sort(function (a, b) {
        if (a.len !== b.len) return a.len - b.len;
        return order.indexOf(a.sym) - order.indexOf(b.sym);
      });
      var codes = {};
      var code = 0, prevLen = 0;
      for (var i = 0; i < items.length; i++) {
        if (i === 0) { code = 0; }
        else { code = (code + 1) << (items[i].len - prevLen); }
        var s = code.toString(2);
        while (s.length < items[i].len) s = '0' + s;
        codes[items[i].sym] = s;
        prevLen = items[i].len;
      }
      return codes;
    }

    /* =====================================================================
       PHASE 2 — PROTECT
       ===================================================================== */
    function renderPhase2() {
      wrap.replaceChildren();
      wrap.appendChild(renderBudget());
      setStatus();

      var pending = packets.filter(function (p) { return !p.ok; }).length;
      wrap.appendChild(mk('div', 'lt-banner',
        '<b>Phase 2 / 3 — Protect.</b> Your ' + compileResult.bits + ' compressed bits ' +
        'split into <b>' + packets.length + '</b> four-bit packets. The channel flips ' +
        'each bit with probability p = ' + NOISE_P.toFixed(2) + '. Pick a code per packet ' +
        '(or set all), then transmit. <b>Failed packets re-queue</b> and must be re-sent — ' +
        'every transmission spends budget. Choose enough armour to get them through ' +
        'without burning the budget to zero.'));

      // the chooser legend with live P_ok at p.
      wrap.appendChild(mk('div', 'lt-label', 'Codes — success per packet at p = ' + NOISE_P.toFixed(2)));
      var chooser = mk('div', 'lt-chooser');
      chooser.appendChild(schemeCard('raw', 'RAW', SCHEME_USES.raw,
        'send the 4 bits bare', pokRaw(NOISE_P)));
      chooser.appendChild(schemeCard('hamming', 'HAMMING(7,4)', SCHEME_USES.hamming,
        'corrects any single flip', pokHamming(NOISE_P)));
      chooser.appendChild(schemeCard('repeat', 'REPEAT×3', SCHEME_USES.repeat,
        'majority vote per bit', pokRepeat(NOISE_P)));
      wrap.appendChild(chooser);

      // set-all controls.
      var setall = mk('div', 'lt-setall');
      setall.appendChild(mk('span', null, 'Set all unsent: '));
      ['raw', 'hamming', 'repeat'].forEach(function (s) {
        var b = mk('button', 'btn btn-ghost', s.toUpperCase());
        b.addEventListener('click', function () {
          packets.forEach(function (p) { if (!p.ok) p.scheme = s; });
          api.sfx('click'); renderPhase2();
        });
        setall.appendChild(b);
      });
      wrap.appendChild(setall);

      // packet grid.
      wrap.appendChild(mk('div', 'lt-label', 'Packets (' + (packets.length - pending) +
        ' delivered · ' + pending + ' pending)'));
      var grid = mk('div', 'lt-pkgrid');
      packets.forEach(function (pk, i) {
        var cell = mk('div', 'lt-pk lt-' + pk.scheme + (pk.ok ? ' lt-okmark' : ''));
        cell.appendChild(mk('div', 'lt-bits', pk.bits));
        cell.appendChild(mk('div', 'lt-sch',
          (pk.ok ? '✓ delivered' : pk.scheme + ' · ' + SCHEME_USES[pk.scheme] + 'u')));
        if (!pk.ok) {
          cell.addEventListener('click', function () { cyclePacket(i); });
        }
        grid.appendChild(cell);
      });
      wrap.appendChild(grid);

      // cost preview of the next transmission of all pending packets.
      var pendingPk = packets.filter(function (p) { return !p.ok; });
      var nextCost = pendingPk.reduce(function (a, p) { return a + SCHEME_USES[p.scheme]; }, 0);
      var info = mk('div', 'lt-metricrow');
      info.appendChild(mk('span', 'g-pill', 'this transmission: ' + nextCost + ' uses'));
      info.appendChild(mk('span', 'g-pill', 'budget after: ' + (budget - nextCost) + ' uses'));
      var expectFails = pendingPk.reduce(function (a, p) {
        return a + (1 - pokOf(p.scheme, NOISE_P));
      }, 0);
      info.appendChild(mk('span', 'g-pill', 'expected re-queues: ' + expectFails.toFixed(1)));
      wrap.appendChild(info);
      if (budget - nextCost < 0) {
        wrap.appendChild(mk('div', 'lt-hint lt-warn',
          'Not enough budget to transmit all pending packets — cheaper codes or you lose the run.'));
      }

      var acts = mk('div', 'lt-setall');
      var tx = mk('button', 'btn btn-primary',
        '▶ Transmit ' + pendingPk.length + ' pending packet' + (pendingPk.length === 1 ? '' : 's'));
      tx.disabled = pendingPk.length === 0;
      tx.addEventListener('click', transmit);
      acts.appendChild(tx);
      wrap.appendChild(acts);
    }

    function schemeCard(scheme, name, uses, sub, pok) {
      var card = mk('div', 'lt-opt');
      card.appendChild(mk('div', 'lt-on-name', name));
      card.appendChild(mk('div', 'lt-on-sub',
        uses + ' uses · ' + sub + '<br>P(ok) = <span class="lt-pok">' +
        (pok * 100).toFixed(1) + '%</span>'));
      return card;
    }

    function cyclePacket(i) {
      var order = ['raw', 'hamming', 'repeat'];
      var cur = order.indexOf(packets[i].scheme);
      packets[i].scheme = order[(cur + 1) % order.length];
      api.sfx('click');
      renderPhase2();
    }

    // Transmit every pending packet once with real randomness; spend uses per
    // packet; failures re-queue. If a transmission can't be afforded, the run
    // dies (budget death). Animates the result briefly then re-renders.
    function transmit() {
      var pending = [];
      for (var i = 0; i < packets.length; i++) if (!packets[i].ok) pending.push(i);
      if (pending.length === 0) return;

      var results = [];   // { idx, ok }
      for (var k = 0; k < pending.length; k++) {
        var idx = pending[k];
        var pk = packets[idx];
        var cost = SCHEME_USES[pk.scheme];
        if (budget - cost < 0) {
          // can't afford this packet → budget death.
          spend(budget); // drain to zero
          phase2Stats.usesSpent += 0;
          renderPhase2();
          later(function () { failRun('phase2'); }, 200);
          return;
        }
        spend(cost);
        phase2Stats.usesSpent += cost;
        phase2Stats.sent++;
        var ok = api.rng() < pokOf(pk.scheme, NOISE_P);
        if (ok) { pk.ok = true; phase2Stats.ok++; }
        else { phase2Stats.requeues++; }
        results.push({ idx: idx, ok: ok });
      }

      // flash the results on the grid, then advance.
      renderPhase2();
      var cells = wrap.querySelectorAll('.lt-pk');
      results.forEach(function (r) {
        if (cells[r.idx]) cells[r.idx].classList.add(r.ok ? 'lt-okmark' : 'lt-failmark');
      });
      api.sfx(results.every(function (r) { return r.ok; }) ? 'good' : 'bad');

      if (budget <= 0 && packets.some(function (p) { return !p.ok; })) {
        later(function () { failRun('phase2'); }, 400);
        return;
      }

      var allOk = packets.every(function (p) { return p.ok; });
      if (allOk) {
        later(function () { startPhase3(); }, 700);
      } else {
        later(function () { renderPhase2(); }, 700);
      }
    }

    /* =====================================================================
       PHASE 3 — RECOVER
       ===================================================================== */
    function startPhase3() {
      phase = 3;
      // build 3 Hamming blocks, each a valid codeword with exactly one flip.
      boards = [];
      for (var b = 0; b < 3; b++) {
        var d1 = api.rng() < 0.5 ? 1 : 0;
        var d2 = api.rng() < 0.5 ? 1 : 0;
        var d3 = api.rng() < 0.5 ? 1 : 0;
        var d4 = api.rng() < 0.5 ? 1 : 0;
        var clean = vennEncode(d1, d2, d3, d4);
        var flip = Math.floor(api.rng() * 7);
        var cw = clean.slice();
        cw[flip] ^= 1;
        boards.push({ data: [d1, d2, d3, d4], clean: clean, cw: cw, flip: flip, solved: false });
      }
      renderPhase3();
    }

    function renderPhase3() {
      wrap.replaceChildren();
      wrap.appendChild(renderBudget());
      setStatus();

      var solvedN = boards.filter(function (b) { return b.solved; }).length;
      wrap.appendChild(mk('div', 'lt-banner',
        '<b>Phase 3 / 3 — Recover.</b> Three Hamming blocks arrived with exactly one ' +
        'flipped bit each — too damaged for the auto-decoder. A circle outlines ' +
        '<span style="color:var(--red)">red</span> when its parity is odd; the flipped ' +
        'bit is the one cell sitting in <i>exactly</i> the red circles. Click it. ' +
        'A wrong click costs <b>' + MISS_PENALTY + ' uses</b> (' + solvedN + '/3 repaired).'));

      var rowEl = mk('div', 'lt-vennrow');
      boards.forEach(function (board, bi) {
        rowEl.appendChild(renderBoard(board, bi));
      });
      wrap.appendChild(rowEl);

      if (budget <= 0 && solvedN < 3) {
        // out of budget mid-recover (e.g. a miss drained it).
        later(function () { failRun('phase3'); }, 200);
      }
    }

    // Build one Venn board as inline SVG. Cells are tappable hit-areas placed
    // over the three circles; each shows its current bit value.
    function renderBoard(board, bi) {
      var holder = mk('div', 'lt-board');
      holder.appendChild(mk('div', 'lt-bt', 'Block ' + (bi + 1)));

      var a = circleParity(board.cw, CIRCLE_A);
      var b = circleParity(board.cw, CIRCLE_B);
      var c = circleParity(board.cw, CIRCLE_C);

      var SVGNS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('viewBox', '0 0 230 210');
      svg.setAttribute('class', 'lt-venn');
      svg.setAttribute('role', 'img');

      // three circles. centers chosen so all 7 regions exist.
      var circles = [
        { cx: 88, cy: 80, parity: a, color: 'var(--blue)' },   // A (top-left)
        { cx: 142, cy: 80, parity: b, color: 'var(--pink)' },  // B (top-right)
        { cx: 115, cy: 128, parity: c, color: 'var(--cyan)' }, // C (bottom)
      ];
      circles.forEach(function (cir) {
        var el2 = document.createElementNS(SVGNS, 'circle');
        el2.setAttribute('cx', cir.cx); el2.setAttribute('cy', cir.cy);
        el2.setAttribute('r', 52);
        el2.setAttribute('fill', 'none');
        el2.setAttribute('stroke', board.solved ? 'var(--green)' : (cir.parity ? 'var(--red)' : cir.color));
        el2.setAttribute('stroke-width', cir.parity && !board.solved ? 3.5 : 2);
        el2.setAttribute('opacity', cir.parity && !board.solved ? 1 : 0.6);
        svg.appendChild(el2);
      });

      // cell positions: [p1,p2,p3,d1,d2,d3,d4] mapped to the 7 Venn regions.
      // index order matches CIRCLE_* membership above.
      var pos = [
        { x: 64, y: 64 },    // 0 p1: A only (upper-left)
        { x: 166, y: 64 },   // 1 p2: B only (upper-right)
        { x: 115, y: 158 },  // 2 p3: C only (bottom)
        { x: 115, y: 66 },   // 3 d1: A∩B (top middle)
        { x: 88, y: 112 },   // 4 d2: A∩C (lower-left)
        { x: 142, y: 112 },  // 5 d3: B∩C (lower-right)
        { x: 115, y: 100 },  // 6 d4: A∩B∩C (center)
      ];
      for (var i = 0; i < 7; i++) {
        (function (idx) {
          var g = document.createElementNS(SVGNS, 'g');
          g.setAttribute('class', 'lt-cell' + (board.solved ? ' lt-solvedcell' : ''));
          var bg = document.createElementNS(SVGNS, 'circle');
          bg.setAttribute('cx', pos[idx].x); bg.setAttribute('cy', pos[idx].y);
          bg.setAttribute('r', 15);
          bg.setAttribute('class', 'lt-cellbg');
          g.appendChild(bg);
          var t = document.createElementNS(SVGNS, 'text');
          t.setAttribute('x', pos[idx].x); t.setAttribute('y', pos[idx].y + 5);
          t.setAttribute('text-anchor', 'middle');
          t.setAttribute('class', 'lt-celltext');
          t.textContent = String(board.cw[idx]);
          g.appendChild(t);
          if (!board.solved) {
            g.addEventListener('click', function () { clickCell(bi, idx); });
          }
          svg.appendChild(g);
        })(i);
      }
      holder.appendChild(svg);

      if (board.solved) {
        holder.appendChild(mk('div', 'lt-vsolved', '✓ repaired — data ' + board.data.join('')));
      } else {
        var pp = (a ? 'A' : '') + (b ? 'B' : '') + (c ? 'C' : '');
        holder.appendChild(mk('div', 'lt-bt',
          'odd circles: ' + (pp || 'none') + ' — click the cell in exactly those'));
      }
      return holder;
    }

    function clickCell(bi, idx) {
      var board = boards[bi];
      if (board.solved) return;
      var target = vennSyndrome(board.cw); // index that is actually flipped
      if (idx === target) {
        board.cw[idx] ^= 1;     // correct it; circles go green/even
        board.solved = true;
        api.sfx('good');
        renderPhase3();
        if (boards.every(function (x) { return x.solved; })) {
          later(function () { succeed(); }, 650);
        }
      } else {
        // wrong click: penalty, board stays.
        spend(MISS_PENALTY);
        phase3Misses++;
        api.sfx('bad');
        if (budget <= 0) {
          renderPhase3();
          later(function () { failRun('phase3'); }, 200);
          return;
        }
        renderPhase3();
      }
    }

    /* =====================================================================
       FINALE
       ===================================================================== */
    function succeed() {
      if (done || ended) return;
      ended = true;
      phase = 3;
      wrap.replaceChildren();
      wrap.appendChild(renderBudget());

      var box = mk('div', 'lt-final');
      box.appendChild(mk('div', 'lt-label', 'Decoded transmission'));
      var typed = mk('div', 'lt-typed', '<span class="lt-caret">▋</span>');
      box.appendChild(typed);
      wrap.appendChild(box);

      // typewriter the message, sfx tick per char, then "NETWORK RESTORED".
      var i = 0;
      interval = setInterval(function () {
        if (i >= MESSAGE.length) {
          clearInterval(interval); interval = null;
          typed.innerHTML = escapeHtmlLocal(MESSAGE);
          api.sfx('win');
          var restored = mk('div', 'lt-restored', 'NETWORK RESTORED');
          box.appendChild(restored);
          var finBtn = mk('button', 'btn btn-primary lt-finalbtn', 'See the run →');
          finBtn.addEventListener('click', function () { finishRun(true); });
          box.appendChild(finBtn);
          // auto-advance as a fallback so the run always reaches complete().
          later(function () { finishRun(true); }, 2600);
          return;
        }
        typed.innerHTML = escapeHtmlLocal(MESSAGE.slice(0, i + 1)) + '<span class="lt-caret">▋</span>';
        api.sfx('tick');
        i++;
      }, 70);
    }

    function failRun(where) {
      if (done || ended) return;
      ended = true;
      clearAllTimers();
      wrap.replaceChildren();
      wrap.appendChild(renderBudget());

      var box = mk('div', 'lt-final');
      box.appendChild(mk('div', 'lt-label', 'Signal collapse — budget exhausted'));
      var glyphs = '░▒▓█▚▞▟▙#%&@';
      var diss = mk('div', 'lt-dissolve', '');
      box.appendChild(diss);
      var noisy = '';
      for (var i = 0; i < MESSAGE.length; i++) {
        noisy += MESSAGE.charAt(i) === ' ' ? ' ' : glyphs.charAt(Math.floor(api.rng() * glyphs.length));
      }
      diss.textContent = noisy;
      box.appendChild(mk('div', 'lt-dead', 'TRANSMISSION LOST'));
      box.appendChild(mk('div', 'lt-hint',
        'The budget ran out before the message was through. Compress tighter and ' +
        'armour smarter — the floor is H·n / C ≈ ' + Math.round(shannonFloorUses) + ' uses.'));
      var btn = mk('button', 'btn btn-primary lt-finalbtn', 'See the run →');
      btn.addEventListener('click', function () { finishRun(false, where); });
      box.appendChild(btn);
      wrap.appendChild(box);
      api.sfx('lose');
    }

    /* ---- tally + api.complete (exactly once, on every path) ---- */
    function finishRun(success, where) {
      if (done) return;
      done = true;
      clearAllTimers();

      var r = budgetFrac(); // remaining budget fraction of the starting budget
      var stars;
      if (!success) stars = 0;
      else if (r >= 0.25) stars = 3;
      else if (r >= 0.08) stars = 2;
      else stars = 1;

      var bits = success ? clamp(Math.round(40 + 60 * r * 2), 25, 100) : 5;

      var compOver = (compileResult ? compileResult.bits : optBits) - optBits;
      var headline = success
        ? (stars === 3 ? 'Network restored — and you barely touched the budget'
          : stars === 2 ? 'Network restored'
          : 'Network restored — on fumes')
        : 'Transmission lost';

      var phase1Bits = compileResult ? compileResult.bits : 0;
      var detailHTML =
        '<p>The whole pipeline, end to end — every bit you saved compressing bought ' +
        'you a channel use to spend protecting.</p>' +
        '<table><thead><tr><th>phase</th><th>what happened</th></tr></thead><tbody>' +
        '<tr><td>1 · compress</td><td>' + phase1Bits + ' bits sent · optimum ' + optBits +
        ' · floor H·n = ' + Hfloor.toFixed(0) + ' bits' +
        (compOver > 0 ? ' <span style="color:var(--red)">(+' + compOver + ' over optimum)</span>'
          : ' <span style="color:var(--green)">(optimal ranking)</span>') + '</td></tr>' +
        '<tr><td>2 · protect</td><td>' + phase2Stats.usesSpent + ' uses spent · ' +
        phase2Stats.sent + ' transmissions · ' + phase2Stats.requeues + ' re-queued by noise</td></tr>' +
        '<tr><td>3 · recover</td><td>' + (success ? (3 - 0) + ' blocks repaired' : 'incomplete') +
        ' · ' + phase3Misses + ' wrong click' + (phase3Misses === 1 ? '' : 's') + '</td></tr>' +
        '<tr><td><b>budget</b></td><td><b>' + budget + '</b> / ' + BUDGET_START +
        ' uses left (' + (r * 100).toFixed(0) + '%) · Shannon floor ≈ ' +
        Math.round(shannonFloorUses) + ' uses</td></tr>' +
        '</tbody></table>' +
        '<p><b>The lesson of the whole course — Shannon’s separation.</b> Compress down ' +
        'to the entropy, then protect up to the capacity, and the two halves never ' +
        'interfere: the floor on the entire pipeline is <b>H·n / C</b>. Every ranked ' +
        'chip, every chosen code, every repaired bit was you fighting to reach that ' +
        'number. ' + (success
          ? 'You got the message home — that is the entire game of information theory in one budget bar.'
          : 'You ran out of budget short of the floor — tighten the compression, match the armour to the noise, and the floor comes within reach.') +
        '</p>';

      setStatus();
      api.complete({ stars: stars, bits: bits, headline: headline, detailHTML: detailHTML });
    }

    /* ---- local helpers ---- */
    function escapeHtmlLocal(s) {
      return String(s).replace(/[&<>"']/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
      });
    }

    // kick off.
    renderPhase1();

    return {
      destroy: function () {
        clearAllTimers();
        // no document-level listeners were added; all listeners die with the DOM.
      },
    };
  },
});

/* ---------- module-scope DOM helper (no globals leak; inside the IIFE) ---------- */
function mk(tag, cls, html) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

})();
