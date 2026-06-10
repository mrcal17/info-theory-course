// Logic test for archipelago/js/puzzles/question_tree.js — see PEDAGOGY.md §6.4.
// Loads the real IIFE with a stub G and tests the pure functions via the
// _logic export: the gate predicate, the optimum (Huffman), the kill-switch
// (count-balanced trees vs parAvg on the REAL dunes config), mass-balanced
// (Shannon–Fano) cost, codeword identities, and the skewed-round trigger.
// Run: cd _smoke && node pz_test_question-tree.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(
  path.join(here, '..', 'archipelago', 'js', 'puzzles', 'question_tree.js'), 'utf8');

const defs = {};
const G = {
  puzzles: { register: (t, d) => { defs[t] = d; } },
  util: { esc: s => String(s) },
  pz: {}, flags: {},
};
new Function('G', src)(G);

const def = defs['question-tree'];
if (!def || !def._logic) { console.error('FATAL: question-tree did not register with _logic'); process.exit(1); }
const L = def._logic;

// The FROZEN config from archipelago/js/islands/02_dunes.js:106
const CRITTERS = [
  { name: 'Sandmouse',   p: 0.40, key: 'mouse' },
  { name: 'Dune-beetle', p: 0.25, key: 'beetle' },
  { name: 'Glasswing',   p: 0.15, key: 'glass' },
  { name: 'Geckotail',   p: 0.10, key: 'gecko' },
  { name: 'Scarab',      p: 0.06, key: 'scarab' },
  { name: 'Antlion',     p: 0.04, key: 'antlion' },
];
const PAR = 2.30;
const GATE = (eq, par) => eq <= par + 1e-9; // the in-game gate predicate

let n = 0, failed = 0;
const check = (name, cond, detail) => {
  n++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${String(n).padStart(2)}. ${name}${detail != null ? '  [' + detail + ']' : ''}`);
  if (!cond) failed++;
};
const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

/* ---- entropy & optimum ---- */
const H = L.entropy(CRITTERS);
check('entropy of dunes config ~ 2.2009', close(H, 2.2009, 2e-4), H.toFixed(4));

const huff = L.huffmanCost(CRITTERS);
check('Huffman optimum = 2.25', close(huff, 2.25), huff.toFixed(4));
check('par sits between H and H + 0.35', PAR > H && PAR <= H + 0.35, `H=${H.toFixed(3)} par=${PAR}`);

/* ---- the informed strategy (peel the likeliest) ---- */
const peel = L.buildPeelTree(CRITTERS);
check('peel tree is complete (all leaves single)', L.allLeavesSingle(peel));
const peelCost = L.expectedQuestions(peel);
check('peel cost = 2.25 (Huffman-equal here)', close(peelCost, 2.25), peelCost.toFixed(4));
check('GATE passes the peel tree', GATE(peelCost, PAR));

/* ---- KILL-SWITCH: count-balanced splits vs the REAL parAvg ---- */
const lazyTree = L.buildLazyCountTree(CRITTERS);
const lazyCost = L.expectedQuestions(lazyTree);
check('lazy count-balanced (listed order) = 2.81', close(lazyCost, 2.81), lazyCost.toFixed(4));
check('GATE blocks the lazy count-balanced tree', !GATE(lazyCost, PAR));

const bd = L.balancedDepths(6).slice().sort((a, b) => a - b).join(',');
check('balancedDepths(6) = 2,2,3,3,3,3', bd === '2,2,3,3,3,3', bd);

const bestCount = L.bestCountBalancedCost(CRITTERS);
check('BEST possible count-balanced tree = 2.35', close(bestCount, 2.35), bestCount.toFixed(4));
check('KILL-SWITCH: even the best count-balanced tree misses par',
  !GATE(bestCount, PAR), `${bestCount.toFixed(2)} > ${PAR}`);

/* ---- mass-balanced (greedy Shannon–Fano, best even-mass split) ---- */
function greedyMassTree(critters) {
  const node = L.makeLeaf(critters.slice());
  if (critters.length < 2) return node;
  let best = null, bestDiff = Infinity;
  const m = critters.length;
  for (let mask = 1; mask < (1 << m) - 1; mask++) {
    const yes = [], no = [];
    for (let i = 0; i < m; i++) ((mask >> i) & 1 ? yes : no).push(critters[i]);
    const d = Math.abs(L.massOf(yes) - L.massOf(no));
    if (d < bestDiff - 1e-12) { bestDiff = d; best = [yes, no]; }
  }
  node.yes = greedyMassTree(best[0]);
  node.no = greedyMassTree(best[1]);
  return node;
}
const sfCost = L.expectedQuestions(greedyMassTree(CRITTERS));
check('greedy mass-balanced (Shannon–Fano) = 2.35', close(sfCost, 2.35), sfCost.toFixed(4));
check('NOTE: greedy mass-balancing ALSO misses par (only peel/Huffman shapes pass)',
  !GATE(sfCost, PAR), `${sfCost.toFixed(2)} > ${PAR}`);

/* ---- gate boundary: a 2.30-exactly tree must pass (<= par + 1e-9) ---- */
// depth profile (1,2,4,4,4,4): Sandmouse@1, Dune-beetle@2, rest@4 = 2.30
const [mo, be, gl, ge, sc, an] = CRITTERS;
const bTree = L.makeLeaf(CRITTERS.slice());
bTree.yes = L.makeLeaf([mo]);
bTree.no = L.makeLeaf([be, gl, ge, sc, an]);
bTree.no.yes = L.makeLeaf([be]);
bTree.no.no = L.makeLeaf([gl, ge, sc, an]);
bTree.no.no.yes = L.makeLeaf([gl, ge]);
bTree.no.no.no = L.makeLeaf([sc, an]);
bTree.no.no.yes.yes = L.makeLeaf([gl]); bTree.no.no.yes.no = L.makeLeaf([ge]);
bTree.no.no.no.yes = L.makeLeaf([sc]);  bTree.no.no.no.no = L.makeLeaf([an]);
const bCost = L.expectedQuestions(bTree);
check('boundary tree costs exactly 2.30', close(bCost, 2.30), bCost.toFixed(10));
check('GATE passes at par exactly (generous boundary)', GATE(bCost, PAR));

/* ---- codewords: depth IS code length; avg questions = avg code length ---- */
const codes = L.collectCodes(peel);
check('peel tree yields 6 codewords', codes.length === 6, codes.map(c => c.code).join(' '));
const prefixFree = codes.every((a, i) => codes.every((b, j) =>
  i === j || (!a.code.startsWith(b.code) && !b.code.startsWith(a.code))));
check('codewords are prefix-free', prefixFree);
const avgLen = codes.reduce((s, c) => s + c.p * c.code.length, 0);
check('avg code length === expected questions (identity)', close(avgLen, peelCost), avgLen.toFixed(4));
check('Sandmouse (likeliest) gets the shortest codeword',
  codes.find(c => c.key === 'mouse').code.length === Math.min(...codes.map(c => c.code.length)));

/* ---- skewed-round trigger ---- */
check('dunes config does NOT trigger the extra skewed round (par forces mass splits)',
  L.needsSkewedRound(CRITTERS, PAR) === false);
const uniform4 = [
  { name: 'a', p: 0.25, key: 'a' }, { name: 'b', p: 0.25, key: 'b' },
  { name: 'c', p: 0.25, key: 'c' }, { name: 'd', p: 0.25, key: 'd' },
];
check('a near-uniform config (4 x 0.25, par 2.10) DOES trigger it',
  L.needsSkewedRound(uniform4, 2.10) === true);

/* ---- internal SKEWED round data is sound ---- */
const S = L.SKEWED;
const sMass = L.massOf(S.critters);
check('SKEWED probabilities sum to 1', close(sMass, 1), sMass.toFixed(4));
const sHuff = L.huffmanCost(S.critters);
const sPeel = L.expectedQuestions(L.buildPeelTree(S.critters));
const sCount = L.bestCountBalancedCost(S.critters);
const sH = L.entropy(S.critters);
check('SKEWED: Huffman (1.68) <= par (1.85)', GATE(sHuff, S.parAvg), sHuff.toFixed(3));
check('SKEWED: peel strategy passes its par', GATE(sPeel, S.parAvg), sPeel.toFixed(3));
check('SKEWED: best count-balanced (2.00) misses its par', !GATE(sCount, S.parAvg), sCount.toFixed(3));
check('SKEWED: par is generous (within H + 0.35)', S.parAvg > sH && S.parAvg <= sH + 0.35, `H=${sH.toFixed(3)}`);

/* ---- splitInfo: the coach read-aloud quantity ---- */
const siNode = L.makeLeaf(CRITTERS.slice());
siNode.yes = L.makeLeaf([mo, be]);           // mass 0.65
siNode.no = L.makeLeaf([gl, ge, sc, an]);    // mass 0.35
const si = L.splitInfo(siNode);
check('splitInfo(0.65/0.35) ~ 0.9341', close(si, 0.93407, 1e-4), si.toFixed(4));

console.log(`\n${n} checks, ${failed === 0 ? 'all pass' : failed + ' FAILED'}`);
console.log(`kill-switch verdict: best count-balanced ${bestCount.toFixed(2)} > parAvg ${PAR} -> gate blocks head-count splitting`);
process.exit(failed ? 1 : 0);
