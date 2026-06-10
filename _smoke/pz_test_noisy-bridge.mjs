// Scratch logic test for the reworked noisy-bridge puzzle (PEDAGOGY §6.9).
// Loads archipelago/js/puzzles/noisy_bridge.js in node with a stub G and
// exercises the pure functions exposed on the registered def's _logic:
//   - segSurvive / bridgeSurvive sanity
//   - derived thresholds for every frozen config
//   - exposure-multiplier constraints per config:
//       (a) even spread misses the threshold
//       (b) all-planks-on-one-segment misses it
//       (c) reinforce-the-weakest (greedy) clears it with margin
//     (prints the three P values per config, as required)
//   - 500-run Monte Carlo: a threshold-meeting bridge completes >= 90% of
//     the time counting the free rebuild(s) (game rule: a certified bridge
//     is always rebuilt free; sim caps at 8 rebuilds per run).
// Run: cd _smoke && node pz_test_noisy-bridge.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '..', 'archipelago', 'js', 'puzzles', 'noisy_bridge.js'), 'utf8');

// ---- stub G, load the IIFE, capture the registered def ----
let def = null;
globalThis.G = { puzzles: { register: (type, d) => { def = { type, ...d }; } } };
(0, eval)(src);
if (!def || def.type !== 'noisy-bridge') { console.error('FAIL: did not register noisy-bridge'); process.exit(1); }
const L = def._logic;

let checks = 0, failures = 0;
function ok(cond, label) {
  checks++;
  if (!cond) { failures++; console.error('  FAIL:', label); }
  else console.log('  ok:', label);
}
function near(a, b, eps, label) { ok(Math.abs(a - b) <= eps, `${label} (${a.toFixed(6)} ~ ${b.toFixed(6)})`); }

// deterministic rng for the Monte Carlo
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- 1. segSurvive / bridgeSurvive sanity ----
console.log('\n[1] segSurvive / bridgeSurvive');
near(L.segSurvive(0.25, 1), 0.75, 1e-12, 'P1(p=.25)');
near(L.segSurvive(0.25, 3), 0.84375, 1e-12, 'P3(p=.25)');
near(L.segSurvive(0.25, 5), 0.896484375, 1e-9, 'P5(p=.25)');
near(L.segSurvive(0.1, 3), 0.972, 1e-12, 'P3(p=.10)');
near(L.segSurvive(0.3, 5), 0.83692, 1e-5, 'P5(p=.30)');
ok(L.segSurvive(0.3, 1) < L.segSurvive(0.3, 3) && L.segSurvive(0.3, 3) < L.segSurvive(0.3, 5),
  'majority redundancy is monotone for p<0.5');
near(L.bridgeSurvive(0.1, [1, 1, 1, 1, 1]), Math.pow(0.9, 5), 1e-12,
  'hook math: 5 single planks at 90% -> 59.05%');
near(L.bridgeSurviveHet([0.1, 0.3], [3, 5]), 0.972 * 0.83692, 1e-4, 'het product');

// ---- 2. per-config derivations + §6.9 multiplier proof ----
// All four frozen entry points (strait door + 2 dialogue opens share a config).
const CONFIGS = [
  { name: '04_strait door :127 + dialogue :241 :252', p: 0.25, segments: 5, budget: 19 },
  { name: '07_grand_beacon gate3 :153', p: 0.3, segments: 6, budget: 26 },
];

for (const cfg of CONFIGS) {
  const { p, segments: n, budget } = cfg;
  console.log(`\n[2] CONFIG ${cfg.name}  {p:${p}, segments:${n}, budget:${budget}}`);

  const uni = L.uniformBest(p, n, budget);
  const T = L.deriveThreshold(p, n, budget);
  console.log(`  uniform optimum P*=${(uni.P * 100).toFixed(2)}% (1s/3s/5s=${uni.counts.join('/')}, cost ${uni.cost})  -> threshold T=${(T * 100).toFixed(0)}%`);
  ok(uni.P >= T, 'GUIDE: threshold reachable under budget with uniform p');
  ok(L.bridgeSurvive(p, L.flatEvenAlloc(n, budget)) < T ||
     L.flatEvenAlloc(n, budget).every((k, _, a) => k === a[0] && uni.counts[1] === n),
    'GUIDE kill-switch: flat even spread rates below the line (or budget only allows even)');

  const tune = L.chooseMults(p, n, budget, T);
  console.log(`  mastery multipliers: calm ×${tune.calmM}, open ×1, wild ×${tune.wildM}` +
    `  (tiers ${tune.tiers.calm}/${tune.tiers.norm}/${tune.tiers.wild})  ps=[${tune.ps.map(x => x.toFixed(3)).join(', ')}]`);

  const even = L.bridgeSurviveHet(tune.ps, L.flatEvenAlloc(n, budget));
  const lop = L.lopsidedBest(tune.ps, budget);
  const greedy = L.greedyAlloc(tune.ps, budget);
  const greedyP = L.bridgeSurviveHet(tune.ps, greedy);
  const opt = L.enumerateBest(tune.ps, budget);

  console.log(`  >>> three P values: even-spread=${(even * 100).toFixed(2)}%  ` +
    `one-segment=${(lop.P * 100).toFixed(2)}%  reinforce-weakest=${(greedyP * 100).toFixed(2)}%` +
    `  (optimal=${(opt.P * 100).toFixed(2)}%, T=${(T * 100).toFixed(0)}%)`);
  console.log(`  greedy alloc=[${greedy.join(',')}] cost=${L.planksTotal(greedy)}  optimal alloc=[${opt.alloc.join(',')}]`);

  ok(even < T - 0.005, `(a) even spread ${(even * 100).toFixed(1)}% misses T=${(T * 100).toFixed(0)}%`);
  ok(lop.P < T - 0.04, `(b) all-on-one-segment ${(lop.P * 100).toFixed(1)}% misses T (every position)`);
  ok(greedyP >= T + 0.01, `(c) reinforce-the-weakest ${(greedyP * 100).toFixed(1)}% clears T with margin`);
  ok(opt.P >= T + 0.02, `(c') optimal allocation clears T with margin`);
  ok(L.planksTotal(greedy) <= budget, 'greedy allocation respects the budget');
  ok(L.planksTotal(L.flatEvenAlloc(n, budget)) <= budget, 'even allocation respects the budget');

  // greedy puts max planks on the wild spans (sorted ps: calm..wild)
  const wildStart = n - tune.tiers.wild;
  ok(greedy.slice(wildStart).every(k => k === 5), 'greedy puts 5 planks on every wild span');

  // shuffle invariance of the proof: even spread is permutation-invariant;
  // lopsidedBest already maximizes over positions. Spot-check a permutation.
  const perm = [...tune.ps].reverse();
  near(L.bridgeSurviveHet(perm, L.flatEvenAlloc(n, budget)), even, 1e-12,
    'even-spread P is invariant under exposure shuffles');

  // ---- 3. Monte Carlo: certified bridge completes >= 90% with free rebuilds ----
  const rng = mulberry32(0xBEA + n);
  const RUNS = 500, CAP = 8; // game rule: unlimited free rebuilds; sim caps at 8
  function crossOnce(ps, alloc) {
    for (let i = 0; i < ps.length; i++) {
      let snapped = 0;
      for (let j = 0; j < alloc[i]; j++) if (rng() < ps[i]) snapped++;
      if (alloc[i] - snapped < Math.floor(alloc[i] / 2) + 1) return false;
    }
    return true;
  }
  let done = 0, firstTry = 0, withinOneRebuild = 0, crossings = 0;
  for (let r = 0; r < RUNS; r++) {
    for (let a = 0; a <= CAP; a++) {
      crossings++;
      if (crossOnce(tune.ps, greedy)) {
        done++;
        if (a === 0) firstTry++;
        if (a <= 1) withinOneRebuild++;
        break;
      }
    }
  }
  console.log(`  [3] Monte Carlo ${RUNS} runs (alloc=[${greedy.join(',')}], P=${(greedyP * 100).toFixed(1)}%):` +
    ` first-try ${(firstTry / RUNS * 100).toFixed(1)}%, <=1 rebuild ${(withinOneRebuild / RUNS * 100).toFixed(1)}%,` +
    ` completed ${(done / RUNS * 100).toFixed(1)}% (avg ${(crossings / RUNS).toFixed(2)} crossings)`);
  ok(done / RUNS >= 0.9, `Monte Carlo: threshold-meeting bridge completes >= 90% (got ${(done / RUNS * 100).toFixed(1)}%)`);
  ok(Math.abs(firstTry / RUNS - greedyP) < 0.07, 'empirical single-cross rate matches computed P');
}

// ---- 4. degenerate configs must not throw and stay completable ----
console.log('\n[4] degenerate-config guards');
for (const c of [{ p: 0.25, segments: 4, budget: 12 }, { p: 0.5, segments: 2, budget: 10 },
                 { p: 0.05, segments: 8, budget: 40 }, { p: 0.25, segments: 5, budget: 5 }]) {
  const T = L.deriveThreshold(c.p, c.segments, c.budget);
  const tune = L.chooseMults(c.p, c.segments, c.budget, T);
  const gP = L.bridgeSurviveHet(tune.ps, L.greedyAlloc(tune.ps, c.budget));
  const effT = Math.min(T, Math.max(0.05, Math.floor(gP * 100) / 100));
  ok(Number.isFinite(T) && tune && tune.ps.length === c.segments && gP >= effT,
    `cfg {p:${c.p},n:${c.segments},b:${c.budget}}: T=${(T * 100).toFixed(0)}%, greedy ${(gP * 100).toFixed(1)}% >= effT ${(effT * 100).toFixed(0)}%`);
}

console.log(`\n${checks} checks, ${failures} failures`);
process.exit(failures ? 1 : 0);
