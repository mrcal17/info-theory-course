// Scratch logic test for oracle-walk (PEDAGOGY.md §4.1 / §6.12).
// Tests the SHIPPED pure functions (exposed via the registered def's _test):
// rank costs, effective-par derivation, decoy invariants, and — by simulation —
// that random tapping blows the gate while a good player passes it >= 90%.
// Run: cd _smoke && node pz_test_oracle-walk.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '..', 'archipelago', 'js', 'puzzles', 'oracle_walk.js'), 'utf8');

// stub G — the IIFE only needs G.puzzles.register at load time
const defs = {};
new Function('G', src)({ puzzles: { register: (t, d) => { defs[t] = d; } } });
const def = defs['oracle-walk'];
const T = def && def._test;

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log('  ok  ' + name + (detail ? '  [' + detail + ']' : '')); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  [' + detail + ']' : '')); }
};

// deterministic rng for simulations
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

console.log('oracle-walk logic test');
check('registered + _test exposed', !!T && typeof def.create === 'function');
if (!T) process.exit(1);

/* ---- 1. rank costs (DESIGN.md schema 12) ---- */
check('costForRank(1) = 1.00', T.costForRank(1) === 1.0);
check('costForRank(2) = 1.58', T.costForRank(2) === 1.58);
check('costForRank(3) = 2.58', T.costForRank(3) === 2.58);

/* ---- 2. sanitize + blind steps ---- */
check("sanitizeText('AbC! d9') -> 'abc d'", T.sanitizeText('AbC! d9') === 'abc d');
check('blindStepsFor(67) = 8', T.blindStepsFor(67) === 8);
check('blindStepsFor(4) = 2', T.blindStepsFor(4) === 2);
check('blindStepsFor(0) = 0', T.blindStepsFor(0) === 0);

/* ---- 3. effective par for the frozen 06_spires config ---- */
const CFG_TEXT = 'the towers do not echo they answer for the sea between them is thin';
const CFG_PAR = 87.0;
const text = T.sanitizeText(CFG_TEXT);
const L = text.length;
const blind = T.blindStepsFor(L);
const parPerStep = CFG_PAR / L;
const eff = T.effectivePar(CFG_PAR, L, blind);
const effManual = CFG_PAR + blind * (1.58 - parPerStep);
console.log(`  -- config: len=${L}, par=${CFG_PAR}, parPerStep=${parPerStep.toFixed(4)}, blind=${blind}`);
console.log(`  -- effective par = ${CFG_PAR} + ${blind}x(1.58 - ${parPerStep.toFixed(4)}) = ${eff.toFixed(4)} (~${eff.toFixed(2)})`);
check('config text length = 67', L === 67);
check('effective par matches formula', Math.abs(eff - effManual) < 1e-9, eff.toFixed(4));
check('effective par ~ 89.25', Math.abs(eff - 89.2519) < 0.001);
check('effectivePar guards len=0', T.effectivePar(5, 0, 8) === 5);

/* ---- 4. random tapping expected bits (kill-switch arithmetic) ---- */
const randStep = T.expectedRandomStepBits();
const randTotal = randStep * L;
console.log(`  -- random tapping: (1+1.58+2.58)/3 = ${randStep.toFixed(4)} bits/step -> ${randTotal.toFixed(2)} bits total`);
console.log(`  -- vs effective par ${eff.toFixed(2)} (gate rate ${(eff / L).toFixed(3)}/step)`);
check('random step bits = 1.72', Math.abs(randStep - 1.72) < 1e-9);
check('random expected total > effective par', randTotal > eff, `${randTotal.toFixed(1)} > ${eff.toFixed(1)}`);
check('random rate > gate rate', randStep > eff / L);

/* ---- 5. decoy/candidate invariants over many draws ---- */
{
  const rng = mulberry32(7);
  let bad = 0;
  for (let i = 0; i < 5000; i++) {
    const p = Math.floor(rng() * L);
    const ch = text[p];
    const d = T.pickDecoys(ch, text.slice(0, p), rng);
    const cands = T.makeCandidates(ch, d, rng);
    if (d.length !== 2 || d[0] === d[1] || d.includes(ch)) bad++;
    else if (cands.length !== 3 || !cands.includes(ch)) bad++;
    else if (new Set(cands).size !== 3) bad++;
  }
  check('5000 draws: 2 distinct decoys, true char present, no dupes', bad === 0, bad + ' bad');
}

/* ---- 6. Monte-Carlo: simulate full corridors against the real decoy gen ---- */
const ORDER = ' ' + T.FREQ; // frequency-aware ordering: space, then e,t,a,...
function stepCost(trueCh, prefix, rng, picker) {
  const cands = T.makeCandidates(trueCh, T.pickDecoys(trueCh, prefix, rng), rng);
  return T.costForRank(picker(cands, trueCh, rng));
}
const pickRandom = (cands, trueCh, rng) => {
  // uniform tap order without replacement -> rank = position of truth
  const order = [...cands];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]];
  }
  return order.indexOf(trueCh) + 1;
};
const pickFreq = (cands, trueCh) => {
  const order = [...cands].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  return order.indexOf(trueCh) + 1;
};
// informed context model: reads the word -> first guess 85% of the time,
// otherwise falls back to frequency ordering (conservative for a good player)
const pickInformedCtx = (cands, trueCh, rng) =>
  rng() < 0.85 ? 1 : pickFreq(cands, trueCh);

function simulate(trials, seed, blindPicker, ctxPicker, blindN, startAt) {
  const rng = mulberry32(seed);
  let totals = [], blindSums = [], ctxSums = [];
  for (let t = 0; t < trials; t++) {
    let total = 0, b = 0, c = 0;
    for (let p = startAt; p < L; p++) {
      const stepIdx = p - startAt;
      const picker = stepIdx < blindN ? blindPicker : ctxPicker;
      const cost = stepCost(text[p], text.slice(0, p), rng, picker);
      total += cost;
      if (stepIdx < blindN) b += cost; else c += cost;
    }
    totals.push(total); blindSums.push(b); ctxSums.push(c);
  }
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  return { totals, meanTotal: mean(totals), meanBlind: mean(blindSums), meanCtx: mean(ctxSums) };
}
const passRate = (totals, cap) => totals.filter(t => t <= cap).length / totals.length;

// 6a. random tapper, first-visit structure (67 predictions, cap = effective par)
{
  const r = simulate(2000, 11, pickRandom, pickRandom, blind, 0);
  const pr = passRate(r.totals, eff);
  console.log(`  -- MC random tapper: mean total ${r.meanTotal.toFixed(2)} bits, pass rate ${(pr * 100).toFixed(2)}%`);
  check('MC random mean ~ 115 (within [110,121])', r.meanTotal > 110 && r.meanTotal < 121, r.meanTotal.toFixed(2));
  check('KILL-SWITCH: random tapper pass rate < 1%', pr < 0.01, (pr * 100).toFixed(2) + '%');
}

// 6b. good player, first visit: frequency-aware blind stage + word-reading context stage
{
  const r = simulate(2000, 23, pickFreq, pickInformedCtx, blind, 0);
  const pr = passRate(r.totals, eff);
  console.log(`  -- MC good player: blind avg ${(r.meanBlind / blind).toFixed(3)} bits/step (blind line 1.58),`);
  console.log(`     ctx avg ${(r.meanCtx / (L - blind)).toFixed(3)} bits/step (par pace ${parPerStep.toFixed(3)}),`);
  console.log(`     mean total ${r.meanTotal.toFixed(2)} vs cap ${eff.toFixed(2)}, pass rate ${(pr * 100).toFixed(1)}%`);
  check('good player blind stage hugs blind line (1.0..1.7)', r.meanBlind / blind > 1.0 && r.meanBlind / blind < 1.7);
  check('good player passes >= 90% (PEDAGOGY §2)', pr >= 0.9, (pr * 100).toFixed(1) + '%');
}

// 6c. taught mode: 7-tile lit prefix, 60 predictions, cap = original config par 87
{
  const freeCount = 7, capT = CFG_PAR;
  const rGood = simulate(2000, 31, pickInformedCtx, pickInformedCtx, 0, freeCount);
  const rRand = simulate(2000, 37, pickRandom, pickRandom, 0, freeCount);
  const prG = passRate(rGood.totals, capT), prR = passRate(rRand.totals, capT);
  console.log(`  -- MC taught mode (60 steps, cap 87): good mean ${rGood.meanTotal.toFixed(2)} pass ${(prG * 100).toFixed(1)}%, ` +
    `random mean ${rRand.meanTotal.toFixed(2)} pass ${(prR * 100).toFixed(2)}%`);
  check('taught: good player passes >= 90%', prG >= 0.9, (prG * 100).toFixed(1) + '%');
  check('taught: random tapper pass rate < 1%', prR < 0.01, (prR * 100).toFixed(2) + '%');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
