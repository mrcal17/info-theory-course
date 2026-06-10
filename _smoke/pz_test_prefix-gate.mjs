// Scratch logic test for the prefix-gate rework — PEDAGOGY.md §4.1 / §6.6.
// Loads the real puzzle file (IIFE) with a stub G, grabs the pure functions
// exposed under the registration's `_test`, and checks: Kraft sums, the
// {1,1,2} impossibility (exhaustive), config solvability, entropy vs the
// achievable average, canonical codes (hint 3 / informed drive), the gate
// predicate, and a pure-logic kill-switch simulation (random tapping never
// opens the gate). Run from _smoke/: node pz_test_prefix-gate.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(
  path.join(here, '..', 'archipelago', 'js', 'puzzles', 'prefix_gate.js'), 'utf8');

const registered = {};
globalThis.G = {
  puzzles: { register: (t, d) => { registered[t] = d; } },
  util: { esc: s => String(s) },
  pz: {}, flags: { has: () => false, set: () => {} },
};
new Function(src)();
const T = registered['prefix-gate']._test;
if (!T) { console.error('FAIL: _test not exposed'); process.exit(1); }

let n = 0, bad = 0;
const check = (name, cond) => {
  n++;
  if (!cond) { bad++; console.error('  FAIL', name); }
  else console.log('  ok  ', name);
};
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// the frozen island config (03_huffman_wood.js:191)
const FREQS = [21, 9, 6, 4, 2];
const MAXBITS = 2.05;
const TOTAL = FREQS.reduce((a, b) => a + b, 0); // 42
const entropy = ps => ps.reduce((h, p) => p > 0 ? h - p * Math.log2(p) : h, 0);

console.log('— Kraft sums —');
check('kraft {1,2,2} = 1 exactly', close(T.kraftSum(['0', '10', '11']), 1));
check('kraft {1,1,2} = 1.25 > 1', close(T.kraftSum(['0', '1', '01']), 1.25));
check('kraft {1,2,3,4,4} = 1 exactly', close(T.kraftSum(['0', '10', '110', '1110', '1111']), 1));
check('kraft ignores blanks', close(T.kraftSum(['0', '', '11']), 0.75));

console.log('— prefix-free checks —');
check('{●,◯●,◯◯} has no violations', T.prefixViolations(['0', '10', '11']).length === 0);
check("'0' prefixes '01'", T.prefixViolations(['0', '01']).length === 1);
check('equal codes clash', T.prefixViolations(['10', '10']).length === 1);

console.log('— the {1,1,2} impossibility (exhaustive, all 16 assignments) —');
{
  const ones = ['0', '1'], twos = ['00', '01', '10', '11'];
  let tried = 0, allBlocked = true;
  for (const a of ones) for (const b of ones) for (const c of twos) {
    tried++;
    const viols = T.prefixViolations([a, b, c]);
    const kraft = T.kraftSum([a, b, c]);
    if (viols.length === 0 || kraft <= 1) allBlocked = false;
  }
  check(`all ${tried} length-{1,1,2} assignments violate prefix-free AND overflow`, allBlocked && tried === 16);
  check('refusal is the only correct move (kraft 1.25 > 1 always)', close(T.kraftSum(['0', '1', '00']), 1.25));
}

console.log('— config solvability + optimum —');
{
  const lens = T.huffmanLengths(FREQS);
  check('huffman lengths for config = {1,2,3,4,4}', JSON.stringify(lens) === '[1,2,3,4,4]');
  const optAvg = lens.reduce((s, l, i) => s + l * [21, 9, 6, 4, 2][i], 0) / TOTAL; // sorted lens ↔ sorted freqs desc
  check('optimal avg = 81/42 ≈ 1.9286', close(optAvg, 81 / 42));
  check(`optimal avg ${optAvg.toFixed(4)} ≤ maxBits ${MAXBITS} (config solvable)`, optAvg <= MAXBITS);
  const H = entropy(FREQS.map(f => f / TOTAL));
  check(`H(freqs) ≈ 1.9095 (got ${H.toFixed(4)})`, close(H, 1.90952, 5e-4));
  check('H ≤ achievable avg (source coding bound)', H <= optAvg + 1e-9);
  check('achievable avg < H + 1 (Huffman bound)', optAvg < H + 1);
  check('tree depth for config = 4 (max needed, ≤ 5)', T.treeDepthFor(FREQS) === 4);
}

console.log('— canonical codes (hint 3 + informed drive use these) —');
{
  const canon = T.canonicalCodes([1, 2, 3, 4, 4]);
  check('canonical {1,2,3,4,4} = 0,10,110,1110,1111',
    JSON.stringify(canon) === '["0","10","110","1110","1111"]');
  check('canonical codes prefix-free', T.prefixViolations(canon).length === 0);
  check('canonical kraft = 1', close(T.kraftSum(canon), 1));
  check('canonical {1,2,2} = 0,10,11', JSON.stringify(T.canonicalCodes([1, 2, 2])) === '["0","10","11"]');
}

console.log('— gate predicate (all three rules) —');
{
  const good = ['0', '10', '110', '1110', '1111'];
  check('optimal assignment passes the gate', T.gateState(good, FREQS, MAXBITS).ok === true);
  const alt = ['0', '100', '101', '110', '111']; // lengths {1,3,3,3,3}, avg 84/42 = 2.0
  check('non-optimal-but-valid {1,3,3,3,3} also passes (generous gate)',
    T.gateState(alt, FREQS, MAXBITS).ok === true);
  check('a blank code fails', T.gateState(['0', '10', '110', '1110', ''], FREQS, MAXBITS).ok === false);
  check('a prefix clash fails', T.gateState(['0', '01', '110', '1110', '1111'], FREQS, MAXBITS).ok === false);
  const overBudget = ['00', '01', '10', '110', '111']; // prefix-free, kraft 1, avg 90/42 ≈ 2.14
  const st = T.gateState(overBudget, FREQS, MAXBITS);
  check('prefix-free flat-ish code over budget fails on avg rule only',
    st.ok === false && st.viols.length === 0 && st.kraft <= 1 && st.avg > MAXBITS);
}

console.log('— kill-switch: random 0/1 tapping never opens the gate —');
{
  // mirror the UI: 5 rows, taps append 0/1 (cap = tree depth 4) or backspace
  let seed = 0xC0FFEE;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;
  const DEPTH = T.treeDepthFor(FREQS);
  let everOk = false, trials = 2000;
  for (let t = 0; t < trials; t++) {
    const codes = ['', '', '', '', ''];
    for (let k = 0; k < 50; k++) {
      const row = Math.floor(rnd() * 5);
      const act = Math.floor(rnd() * 3);
      if (act === 2) codes[row] = codes[row].slice(0, -1);
      else if (codes[row].length < DEPTH) codes[row] += String(act);
      if (T.gateState(codes, FREQS, MAXBITS).ok) everOk = true;
    }
  }
  check(`${trials} trials × 50 random taps: gate never opened`, !everOk);
}

console.log('— weighted average —');
check('weightedAvg of optimal = 81/42',
  close(T.weightedAvg(['0', '10', '110', '1110', '1111'], FREQS), 81 / 42));

console.log(`\n${n} checks, ${bad} failures`);
process.exit(bad ? 1 : 0);
