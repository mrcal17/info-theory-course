// Scratch logic test for the 'scales' rework — PEDAGOGY.md §4 (self-verification 1).
// Loads archipelago/js/puzzles/scales.js with a stub G and exercises the pure
// logic exposed on the def as _logic: weighing elimination, worst-case candidate
// counting, the certainty-lost (Shannon interrupt) predicate, and the
// forced-accusation predicate. Run from _smoke/:  node pz_test_scales.mjs
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(here, '..', 'archipelago', 'js', 'puzzles', 'scales.js'), 'utf8');

const defs = {};
globalThis.G = { puzzles: { register: (t, d) => { defs[t] = d; } } };
(0, eval)(src);

const L = defs.scales && defs.scales._logic;
if (!L) { console.error('FAIL: scales did not register or expose _logic'); process.exit(1); }

let n = 0, bad = 0;
const ok = (cond, name) => { n++; if (!cond) { bad++; console.error('FAIL:', name); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const all9 = [...Array(9).keys()];
const Lp = [0, 1, 2], Rp = [3, 4, 5];

// ---- applyWeighing: outcome -> surviving candidate set ----
ok(eq(L.applyWeighing(all9, Lp, Rp, 'balance', 'light'), [6, 7, 8]), 'light balance -> bench');
ok(eq(L.applyWeighing(all9, Lp, Rp, 'left', 'light'), [3, 4, 5]), 'light left-down -> right pan (it rose)');
ok(eq(L.applyWeighing(all9, Lp, Rp, 'right', 'light'), [0, 1, 2]), 'light right-down -> left pan (it rose)');
ok(eq(L.applyWeighing(all9, Lp, Rp, 'balance', 'heavy'), [6, 7, 8]), 'heavy balance -> bench');
ok(eq(L.applyWeighing(all9, Lp, Rp, 'left', 'heavy'), [0, 1, 2]), 'heavy left-down -> left pan');
ok(eq(L.applyWeighing(all9, Lp, Rp, 'right', 'heavy'), [3, 4, 5]), 'heavy right-down -> right pan');

// ---- predictTilt consistent with applyWeighing for every fake, both odds ----
for (const odd of ['light', 'heavy']) {
  for (const fake of all9) {
    for (const [l, r] of [[Lp, Rp], [[6], [7]], [[0, 8], [2, 4]]]) {
      const t = L.predictTilt(fake, l, r, odd);
      const surv = L.applyWeighing(all9, l, r, t, odd);
      ok(surv.includes(fake), `consistency odd=${odd} fake=${fake} pans=${l}|${r}`);
    }
  }
}

// ---- pansValid ----
ok(L.pansValid([0], [1]), 'pansValid 1v1');
ok(!L.pansValid([0, 1], [2]), 'pansValid unequal');
ok(!L.pansValid([], []), 'pansValid empty');

// ---- ceilLog3 / pow3 ----
ok(L.ceilLog3(1) === 0 && L.ceilLog3(2) === 1 && L.ceilLog3(3) === 1, 'ceilLog3 small');
ok(L.ceilLog3(4) === 2 && L.ceilLog3(9) === 2 && L.ceilLog3(10) === 3 && L.ceilLog3(27) === 3, 'ceilLog3 mid');
ok(L.pow3(0) === 1 && L.pow3(1) === 3 && L.pow3(2) === 9 && L.pow3(3) === 27, 'pow3');

// ---- worst-case candidate counting ----
ok(L.worstCase(all9, [0, 1, 2, 3], [4, 5, 6, 7]) === 4, 'wc 4v4 = 4');
ok(L.worstCase(all9, Lp, Rp) === 3, 'wc 3v3 = 3');
ok(L.worstCase(all9, [0, 1], [2, 3]) === 5, 'wc 2v2 = 5 (bench)');
ok(L.worstCase(all9, [0], [1]) === 7, 'wc 1v1 = 7 (bench)');
ok(L.worstCase([6, 7, 8], [0], [1]) === 3, 'wc junk pans (no candidates) = all 3 idle');
ok(L.worstCase([6, 7, 8], [6], [7]) === 1, 'wc 1v1 of suspects = 1');
ok(eq(L.splitSizes(all9, [0, 1, 2, 3], [4, 5, 6, 7]), [4, 4, 1]), 'splitSizes 4v4');

// ---- certaintyLost: the Shannon-interrupt predicate (worst-case based) ----
// From 9 candidates with 1 weighing remaining after this one (K=2, first weighing):
ok(L.certaintyLost(all9, [0, 1, 2, 3], [4, 5, 6, 7], 1) === true, '4v4 first -> interrupt (4 > 3)');
ok(L.certaintyLost(all9, Lp, Rp, 1) === false, '3v3 first -> fine (3 <= 3)');
ok(L.certaintyLost(all9, [0, 1], [2, 3], 1) === true, '2v2 first -> interrupt (bench 5 > 3)');
ok(L.certaintyLost(all9, [0], [1], 1) === true, '1v1 first -> interrupt (bench 7 > 3)');
// From 3 candidates with 0 weighings remaining after this one (second weighing):
ok(L.certaintyLost([6, 7, 8], [6], [7], 0) === false, '1v1 of suspects -> fine (1/1/1)');
ok(L.certaintyLost([6, 7, 8], [6], [0], 0) === true, 'suspect v clean -> interrupt (bench 2 > 1)');
ok(L.certaintyLost([6, 7, 8], [0], [1], 0) === true, 'clean v clean (junk) -> interrupt (3 > 1)');
// Padding with eliminated (clean) coins keeps the 1/1/1 split legal:
ok(L.certaintyLost([6, 7, 8], [6, 0], [7, 1], 0) === false, 'padded 2v2 (1 suspect each) -> fine');
// Feasibility guard: if certainty was already impossible, do not interrupt (avoid loops):
ok(L.certaintyLost(all9, Lp, Rp, 0) === false, 'guard: 9 cands, 1 weighing total -> no interrupt');
// Interrupt is OUTCOME-INDEPENDENT: 4v4 balance leaves 1 survivor, still lost.
ok(L.applyWeighing(all9, [0, 1, 2, 3], [4, 5, 6, 7], 'balance', 'light').length === 1
   && L.certaintyLost(all9, [0, 1, 2, 3], [4, 5, 6, 7], 1) === true,
   'lucky 4v4 balance still counts as certainty lost');

// ---- forced-accusation predicate ----
ok(L.canAccuse([4]) === true, 'canAccuse singleton');
ok(L.canAccuse([1, 2]) === false, 'canAccuse pair');
ok(L.canAccuse(all9) === false, 'canAccuse full set');

// ---- full informed strategy simulation: 3v3 then 1v1, every fake, both odds ----
for (const odd of ['light', 'heavy']) {
  for (const fake of all9) {
    let cands = all9.slice(), weighings = 0;
    // weighing 1: 3 v 3
    let l = [0, 1, 2], r = [3, 4, 5];
    ok(L.certaintyLost(cands, l, r, 1) === false, `sim w1 legal odd=${odd} fake=${fake}`);
    cands = L.applyWeighing(cands, l, r, L.predictTilt(fake, l, r, odd), odd); weighings++;
    ok(cands.length === 3 && cands.includes(fake), `sim w1 -> 3 suspects odd=${odd} fake=${fake}`);
    // weighing 2: suspect v suspect
    l = [cands[0]]; r = [cands[1]];
    ok(L.certaintyLost(cands, l, r, 0) === false, `sim w2 legal odd=${odd} fake=${fake}`);
    cands = L.applyWeighing(cands, l, r, L.predictTilt(fake, l, r, odd), odd); weighings++;
    ok(L.canAccuse(cands) && cands[0] === fake && weighings === 2,
       `sim forced accusation = fake in 2 odd=${odd} fake=${fake}`);
  }
}

// ---- naive simulation: 4v4 always interrupted; guesses never unlock ----
for (const fake of all9) {
  const t = L.predictTilt(fake, [0, 1, 2, 3], [4, 5, 6, 7], 'light');
  const surv = L.applyWeighing(all9, [0, 1, 2, 3], [4, 5, 6, 7], t, 'light');
  ok(L.certaintyLost(all9, [0, 1, 2, 3], [4, 5, 6, 7], 1) === true, `naive 4v4 interrupted fake=${fake}`);
  ok(surv.length === 1 || L.canAccuse(surv) === false, `naive survivors not accusable fake=${fake}`);
}
// A guess with the full set can never be a forced accusation, even if "right":
ok(L.canAccuse(all9) === false, 'kill-switch: accuse-without-weighing is always a guess');

console.log(bad ? `${bad}/${n} checks FAILED` : `all ${n} checks pass`);
process.exit(bad ? 1 : 0);
