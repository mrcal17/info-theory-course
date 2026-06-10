// Scratch logic test for the pair-lock rework (PEDAGOGY.md §6.11, §4.1).
// Loads the puzzle IIFE with a stub G and exercises the pure helpers exposed
// on the registered def as _qa: gate math, deck quantization, the I=0
// independence joint, and the kill-switch proof for BOTH spires configs.
// Run: cd _smoke && node pz_test_pair-lock.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '..', 'archipelago', 'js', 'puzzles', 'pair_lock.js'), 'utf8');

// stub namespace: registration is the only top-level side effect
const defs = {};
globalThis.G = { puzzles: { register: (t, d) => { defs[t] = d; } } };
new Function(src)();
const q = defs['pair-lock'] && defs['pair-lock']._qa;
if (!q) { console.error('FAIL: pair-lock did not register with _qa helpers'); process.exit(1); }

let n = 0, bad = 0;
const ok = (cond, label) => { n++; if (!cond) { bad++; console.log('  FAIL', label); } else console.log('  ok  ', label); };
const close = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

/* ---------------- the two frozen spires configs ---------------- */
const CONFIGS = [
  { name: 'east tower (06_spires.js:107)', labels: ['☾', '☀', '✶'],
    joint: [[12, 1, 1], [1, 12, 1], [1, 1, 12]], rounds: 9, goal: 6 },
  { name: 'west attic (06_spires.js:129)', labels: ['☾', '☀', '✶'],
    joint: [[15, 9, 0], [0, 9, 15], [9, 8, 1]], rounds: 11, goal: 5 },
];

/* ---------------- basic math sanity ---------------- */
console.log('— math helpers —');
{
  const J = q.normalizeJoint([[1, 1], [1, 1]]);
  ok(close(q.mutualInfoBits(J), 0), 'uniform 2x2 has I=0');
  ok(close(q.entropyBits([0.5, 0.5]), 1), 'H(1/2,1/2)=1');
  const Jd = q.normalizeJoint([[1, 0], [0, 1]]);
  ok(close(q.mutualInfoBits(Jd), 1), 'diagonal 2x2 has I=1');
  ok(close(q.bestRate(Jd), 1), 'diagonal bestRate=1');
  ok(close(q.chanceRate(Jd), 0.5), 'diagonal chanceRate=0.5');
}

/* ---------------- I = H(B) − H(B|A) identity on both configs ---------------- */
console.log('— I = H(B) − H(B|A) (debrief equation) —');
for (const c of CONFIGS) {
  const J = q.normalizeJoint(c.joint);
  const hB = q.entropyBits(q.colMarginals(J));
  const hBgA = q.condEntropyBits(J);
  const mi = q.mutualInfoBits(J);
  ok(close(hB - hBgA, mi, 1e-12), `${c.name}: H(B)=${hB.toFixed(4)} − H(B|A)=${hBgA.toFixed(4)} = I=${mi.toFixed(4)}`);
}

/* ---------------- independence-round joint construction ---------------- */
console.log('— independence joint (round 2): I=0, skewed marginals, identical rows —');
for (const sz of [2, 3, 4]) {
  const J0 = q.indepJoint(sz);
  const sum = J0.flat().reduce((a, b) => a + b, 0);
  ok(close(sum, 1, 1e-12), `n=${sz}: sums to 1`);
  ok(close(q.mutualInfoBits(J0), 0, 1e-12), `n=${sz}: I(X;Y)=0 exactly`);
  const pb = q.colMarginals(J0);
  ok(Math.max(...pb) - Math.min(...pb) > 0.15, `n=${sz}: B-marginal is skewed (${pb.map(x => x.toFixed(2)).join(',')})`);
  const pa = q.rowMarginals(J0);
  ok(Math.max(...pa) - Math.min(...pa) > 0.15, `n=${sz}: A-marginal is skewed (${pa.map(x => x.toFixed(2)).join(',')})`);
  // rows proportional: every conditional row equals the B-marginal
  let same = true;
  for (let a = 0; a < sz; a++) {
    const cond = q.conditionalRow(J0, a);
    for (let b = 0; b < sz; b++) if (!close(cond[b], pb[b], 1e-12)) same = false;
  }
  ok(same, `n=${sz}: every row is the SAME row (P(B|A=a) = P(B))`);
}

/* ---------------- deck quantization ---------------- */
console.log('— deck quantization —');
for (const c of CONFIGS) {
  const J = q.normalizeJoint(c.joint);
  for (const R of [c.rounds, c.rounds + 5, 16]) {
    const counts = q.quantizeDeck(J, R);
    const total = counts.flat().reduce((a, b) => a + b, 0);
    ok(total === R, `${c.name}: deck of R=${R} has exactly ${R} cards`);
    // each cell within 1 of its expectation (largest remainder property)
    let okq = true;
    counts.forEach((row, a) => row.forEach((v, b) => { if (Math.abs(v - J[a][b] * R) >= 1) okq = false; }));
    ok(okq, `${c.name}: R=${R} every cell within 1 of p·R`);
  }
}

/* ---------------- gate math + KILL-SWITCH per config ---------------- */
console.log('— mastery plan: gate vs strategies (the kill-switch proof) —');
for (const c of CONFIGS) {
  const J = q.normalizeJoint(c.joint);
  const best = q.bestRate(J);
  const chance = q.chanceRate(J);
  const plan = q.masteryPlan(J, c.rounds);
  const st = q.deckStats(J, plan.counts);
  const expBestHits = plan.rounds * best;
  console.log(`  [${c.name}] config rounds=${c.rounds} -> mastery rounds=${plan.rounds}` +
    (plan.widened ? ' (WIDENED)' : '') +
    ` | bestRate=${best.toFixed(4)} blindRate=${chance.toFixed(4)}`);
  console.log(`    expected best hits = ${plan.rounds}×${best.toFixed(4)} = ${expBestHits.toFixed(2)}` +
    ` | gate = floor(${expBestHits.toFixed(2)})−1 = ${plan.gate}`);
  console.log(`    deck: row-argmax hits=${st.argmaxHits}, constant-B hits=${JSON.stringify(st.constHits)}` +
    ` (marginal-argmax B=${c.labels[q.argmax(q.colMarginals(J))]} -> ${st.constHits[q.argmax(q.colMarginals(J))]})`);
  ok(plan.gate === Math.floor(expBestHits) - 1, `${c.name}: gate = floor(R·bestRate) − 1`);
  ok(st.argmaxHits >= plan.gate + 2, `${c.name}: row-argmax play passes deterministically with slack (${st.argmaxHits} ≥ ${plan.gate}+2)`);
  // the lazy sequence: tap the globally-commonest B every spin
  const blindHits = st.constHits[q.argmax(q.colMarginals(J))];
  ok(blindHits <= plan.gate - 2, `${c.name}: KILL-SWITCH — always-commonest-B scores ${blindHits} < gate ${plan.gate} (margin ≥2), every shuffle`);
  // stronger: ANY constant button fails
  ok(st.maxConst <= plan.gate - 2, `${c.name}: ANY constant-B strategy ≤ ${st.maxConst} < gate ${plan.gate}`);
  // honest readout: deck argmax within 1 of R·bestRate
  ok(Math.abs(st.argmaxHits - expBestHits) <= 1, `${c.name}: deck best (${st.argmaxHits}) within 1 of R·bestRate (${expBestHits.toFixed(2)})`);
  // i.i.d. expected-hits comparison (the directive's framing), printed for the record
  console.log(`    i.i.d. expectations over R=${plan.rounds}: blind=${(plan.rounds * chance).toFixed(2)}` +
    ` vs gate=${plan.gate} vs best=${expBestHits.toFixed(2)}`);
  ok(plan.rounds * chance < plan.gate, `${c.name}: blind expected hits ${(plan.rounds * chance).toFixed(2)} below gate ${plan.gate}`);
}

/* ---------------- guide round (config rounds/goal) sanity ---------------- */
console.log('— guide round: config goal reachable by row-argmax, not by blind —');
for (const c of CONFIGS) {
  const J = q.normalizeJoint(c.joint);
  const counts = q.quantizeDeck(J, c.rounds);
  const st = q.deckStats(J, counts);
  ok(st.argmaxHits >= c.goal, `${c.name}: guide deck argmax hits ${st.argmaxHits} ≥ config goal ${c.goal}`);
  ok(st.maxConst < c.goal, `${c.name}: guide deck constant-B max ${st.maxConst} < config goal ${c.goal}`);
}

/* ---------------- degenerate configs must not break create-time math ---------------- */
console.log('— robustness (walkthrough force-opens with odd configs) —');
{
  const J = q.normalizeJoint([[0.4, 0.1], [0.1, 0.4]]); // schema default 2x2
  const plan = q.masteryPlan(J, 8);
  ok(plan && plan.rounds >= 8 && plan.gate >= 1, `default 2x2: plan exists (R=${plan.rounds}, gate=${plan.gate})`);
  const Jd = q.normalizeJoint([[1, 0], [0, 1]]); // fully deterministic
  const pland = q.masteryPlan(Jd, 6);
  const std = q.deckStats(Jd, pland.counts);
  ok(std.argmaxHits >= pland.gate, `deterministic 2x2: argmax ${std.argmaxHits} ≥ gate ${pland.gate}`);
  ok(std.maxConst < pland.gate, `deterministic 2x2: constant-B ${std.maxConst} < gate ${pland.gate}`);
}

console.log(`\n${n} checks, ${bad} failures`);
process.exit(bad ? 1 : 0);
