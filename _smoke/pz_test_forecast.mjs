// Scratch logic test for the reworked 'forecast' puzzle (PEDAGOGY.md §6.3).
// Loads the REAL archipelago/js/puzzles/forecast.js with a stub G and tests
// the exported pure logic: surprisal pricing, guide-sequence kill-switch,
// H assembly, and the mastery expected-value math (rarest-vent camping must
// fail <50% of 200 simulated runs on BOTH dune configs; best-vent camping
// must succeed >90%). Run: node pz_test_forecast.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(
  path.join(here, '..', 'archipelago', 'js', 'puzzles', 'forecast.js'), 'utf8');

// ---- stub G, load the IIFE ----
const defs = {};
const G = {
  puzzles: { register: (t, d) => { defs[t] = d; } },
  util: { esc: s => String(s) },
};
new Function('G', 'window', 'document', src)(G, {}, undefined);
const L = defs.forecast && defs.forecast.logic;
if (!L) { console.error('FAIL: forecast did not register or has no .logic'); process.exit(1); }

// ---- tiny harness ----
let n = 0, bad = 0;
const ok = (cond, label) => {
  n++;
  if (!cond) { bad++; console.error('  FAIL', label); }
  else console.log('  ok  ', label);
};
const close = (a, b, tol) => Math.abs(a - b) <= tol;

// deterministic PRNG
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// the two FROZEN dune configs (02_dunes.js:92 and :122) — copied, not edited
const CFG1 = {
  vents: [
    { label: 'HUFF the Steady', p: 0.55 },
    { label: 'Cough', p: 0.25 },
    { label: 'Sputter', p: 0.15 },
    { label: 'Shy', p: 0.05 },
  ],
  goalBits: 5.5, rounds: 18,
};
const CFG2 = {
  vents: [
    { label: 'Bluster', p: 0.50 },
    { label: 'Hiss', p: 0.27 },
    { label: 'Spit', p: 0.14 },
    { label: 'Whisper', p: 0.06 },
    { label: 'Jackpot', p: 0.03 },
  ],
  goalBits: 5.5, rounds: 17,
};

console.log('1. surprisal pricing (dyadic teach vents are whole bits)');
ok(close(L.surprisal(1 / 2), 1, 1e-12), 'surprisal(1/2)  = 1');
ok(close(L.surprisal(1 / 4), 2, 1e-12), 'surprisal(1/4)  = 2');
ok(close(L.surprisal(1 / 8), 3, 1e-12), 'surprisal(1/8)  = 3');
ok(close(L.surprisal(1 / 16), 4, 1e-12), 'surprisal(1/16) = 4');
ok(L.TEACH_VENTS.every(v => close(L.correctPrice(v.p), L.surprisal(v.p), 1e-9)),
  'correctPrice exact on every teach vent (tolerance 1e-9)');
ok(L.dyadicExp(0.25) === 2 && L.dyadicExp(0.55) === 0, 'dyadicExp: 0.25→2, 0.55→non-dyadic');
ok(close(L.TEACH_VENTS.reduce((s, v) => s + v.p, 0), 1, 1e-12), 'teach field p sums to 1');

console.log('2. guide sequence + pricing kill-switch');
{
  let allLensOk = true, allBitsCovered = true;
  const maxConst = [0, 0, 0, 0, 0]; // index by chip value 1..4
  for (let s = 1; s <= 2000; s++) {
    const seq = L.guideSequence(mulberry32(s));
    if (seq.length !== 6) allLensOk = false;
    const prices = seq.map(vi => L.correctPrice(L.TEACH_VENTS[vi].p));
    for (const b of [1, 2, 3, 4]) if (!prices.includes(b)) allBitsCovered = false;
    for (let chip = 1; chip <= 4; chip++) {
      const right = prices.filter(p => p === chip).length;
      if (right > maxConst[chip]) maxConst[chip] = right;
    }
  }
  ok(allLensOk, 'sequence length always 6');
  ok(allBitsCovered, 'every bit value 1..4 appears in every sequence');
  for (let chip = 1; chip <= 4; chip++) {
    ok(maxConst[chip] < L.GUIDE_NEED,
      `constant "${chip} bit" pricing: max ${maxConst[chip]}/6 right over 2000 seqs — below the 4-of-6 gate`);
  }
}

console.log('3. H assembly (STRIP gate)');
ok(close(L.teachH(), 1.875, 1e-12), 'teach H = 1.875 exactly');
ok(close(L.TEACH_VENTS.reduce((s, v) => s + L.tileValue(v), 0), L.teachH(), 1e-12),
  'tiles sum to H');
ok(L.assemblyOK([1, 1, 1, 1, 1]) === true, 'all vents once → pass');
ok(L.assemblyOK([0, 1, 1, 1, 1]) === false, 'missing vent → fail');
ok(L.assemblyOK([2, 1, 1, 1, 0]) === false, 'duplicate + missing → fail');
ok(L.assemblyOK([1, 1, 1, 1, 2]) === false, 'duplicate → fail');
ok(L.assemblyOK([1, 1, 1, 1]) === false, 'wrong arity → fail');

console.log('4. binomial machinery');
ok(close(L.binomTail(18, 0.25, 0), 1, 1e-12), 'tail at k=0 is 1');
ok(close(L.binomTail(18, 0.25, 19), 0, 1e-12), 'tail past n is 0');
ok(close(L.binomTail(17, 0.5, 6), 1 - 9402 / 131072, 1e-12),
  'binomTail(17,.5,6) matches exact 1−9402/2^17');
ok(L.hitsNeeded(5.5, L.surprisal(0.05)) === 2, 'Shy (4.32 bits) needs 2 hits for 5.5');
ok(L.hitsNeeded(5.5, L.surprisal(0.03)) === 2, 'Jackpot (5.06 bits) needs 2 hits for 5.5');
ok(L.hitsNeeded(5.5, L.surprisal(0.25)) === 3, 'Cough (2 bits) needs 3 hits');
ok(L.hitsNeeded(5.5, L.surprisal(0.50)) === 6, 'Bluster (1 bit) needs 6 hits');
ok(L.hitsNeeded(5.5, L.surprisal(0.55)) === 7, 'HUFF (0.86 bits) needs 7 hits');

console.log('5. mastery gate math on BOTH frozen dune configs');
for (const [name, cfg] of [['dn-gate (02_dunes.js:92)', CFG1], ['dn-mastery (02_dunes.js:122)', CFG2]]) {
  console.log(`  -- ${name}: goal ${cfg.goalBits} bits in ${cfg.rounds} rounds, H = ${L.entropy(cfg.vents).toFixed(3)}`);
  const table = cfg.vents.map((v, i) => ({
    vent: v.label, p: v.p,
    pays: +L.surprisal(v.p).toFixed(3),
    hitsNeeded: L.hitsNeeded(cfg.goalBits, L.surprisal(v.p)),
    analyticWin: +L.ventSuccess(v, cfg.goalBits, cfg.rounds).toFixed(4),
    idx: i,
  }));
  console.table(table.map(({ idx, ...r }) => r));
  const rarest = L.rarestIndex(cfg.vents);
  const best = L.bestVentIndex(cfg.vents, cfg.goalBits, cfg.rounds);
  ok(rarest === cfg.vents.length - 1, `rarest vent is ${cfg.vents[rarest].label}`);

  // analytic proof
  const pRare = L.ventSuccess(cfg.vents[rarest], cfg.goalBits, cfg.rounds);
  const pBest = L.ventSuccess(cfg.vents[best], cfg.goalBits, cfg.rounds);
  ok(pRare < 0.5, `analytic: rarest-vent camping wins ${(pRare * 100).toFixed(1)}% < 50%`);
  ok(pBest > 0.9, `analytic: best vent (${cfg.vents[best].label}) wins ${(pBest * 100).toFixed(1)}% > 90%`);

  // 200 simulated runs each (deterministic seeds)
  const sim = (idx, seedBase) => {
    let wins = 0;
    for (let s = 0; s < 200; s++) {
      if (L.simulateCamp(cfg.vents, idx, cfg.goalBits, cfg.rounds, mulberry32(seedBase + s))) wins++;
    }
    return wins;
  };
  const wRare = sim(rarest, 10_000);
  const wBest = sim(best, 20_000);
  ok(wRare < 100, `200-run sim: rarest camping wins ${wRare}/200 (<50%)`);
  ok(wBest > 180, `200-run sim: best-vent camping wins ${wBest}/200 (>90%)`);
  ok(close(wRare / 200, pRare, 0.08) && close(wBest / 200, pBest, 0.08),
    'sim agrees with analytic within 8 points');
}

console.log('6. convergence of the 40-blow fast-forward (STRIP payoff)');
{
  let grand = 0;
  const sims = 300;
  for (let s = 0; s < sims; s++) {
    const rng = mulberry32(777 + s);
    let tot = 0;
    for (let i = 0; i < 40; i++) tot += L.surprisal(L.TEACH_VENTS[L.sampleVent(L.TEACH_VENTS, rng())].p);
    grand += tot / 40;
  }
  const meanAvg = grand / sims;
  ok(close(meanAvg, L.teachH(), 0.05),
    `mean 40-blow average ${meanAvg.toFixed(3)} ≈ H ${L.teachH()} (±0.05)`);
}

console.log('7. sampleVent edge behavior');
ok(L.sampleVent(CFG1.vents, 0) === 0, 'u=0 → first vent');
ok(L.sampleVent(CFG1.vents, 0.999999) === 3, 'u→1 → last vent');
ok(L.sampleVent(CFG1.vents, 0.56) === 1, 'u=0.56 → second vent (cum .55..)');

console.log(`\n${n} checks, ${bad} failures`);
process.exit(bad ? 1 : 0);
